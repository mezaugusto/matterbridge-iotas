import { thermostatDevice } from 'matterbridge';
import { Thermostat } from 'matterbridge/matter/clusters';

import type { Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import {
  bridgedNode,
  createBridgedEndpoint,
  findFeature,
  fromMatterCentiCelsius,
  multiFeatureResult,
  requireFeature,
  toCelsius,
  toMatterCentiCelsius,
} from './helpers.js';
import { FeatureType } from '../constants.js';

/**
 * Map IOTAS thermostat mode values to Matter SystemMode.
 * IOTAS modes: 0=Off, 1=Heat, 2=Cool, 3=Emergency Heat, 4=Auto
 */
export function iotasModeToSystemMode(iotasMode: number): Thermostat.SystemMode {
  switch (iotasMode) {
    case 1:
      return Thermostat.SystemMode.Heat;
    case 2:
      return Thermostat.SystemMode.Cool;
    case 3:
      return Thermostat.SystemMode.EmergencyHeat;
    case 4:
      return Thermostat.SystemMode.Auto;
    default:
      return Thermostat.SystemMode.Off;
  }
}

/**
 * Map Matter SystemMode to IOTAS thermostat mode value.
 */
function systemModeToIotasMode(systemMode: Thermostat.SystemMode): number {
  switch (systemMode) {
    case Thermostat.SystemMode.Heat:
      return 1;
    case Thermostat.SystemMode.Cool:
      return 2;
    case Thermostat.SystemMode.EmergencyHeat:
      return 3;
    case Thermostat.SystemMode.Auto:
      return 4;
    default:
      return 0;
  }
}

export function createThermostat(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const tempFeature = requireFeature(device, FeatureType.CurrentTemperature, ctx, 'thermostat');
  const modeFeature = findFeature(device, FeatureType.ThermostatMode);
  const heatSetpointFeature = findFeature(device, FeatureType.HeatSetPoint);
  const coolSetpointFeature = findFeature(device, FeatureType.CoolSetPoint);

  if (!tempFeature) {
    return null;
  }

  // createDefaultThermostatClusterServer takes degrees Celsius (multiplies by 100 internally)
  const currentTempC = toCelsius(tempFeature.value ?? 70);
  const heatSetpointC = toCelsius(heatSetpointFeature?.value ?? 68);
  const coolSetpointC = toCelsius(coolSetpointFeature?.value ?? 76);

  const endpoint = createBridgedEndpoint([thermostatDevice, bridgedNode], device, ctx)
    .createDefaultThermostatClusterServer(currentTempC, heatSetpointC, coolSetpointC)
    .addRequiredClusterServers();

  // Command handler: system mode changes from Matter controller
  if (modeFeature) {
    endpoint.subscribeAttribute(Thermostat.Cluster.id, 'systemMode', (newValue: Thermostat.SystemMode) => {
      const iotasMode = systemModeToIotasMode(newValue);
      ctx.onFeatureUpdate(modeFeature.id, iotasMode);
    });
  }

  // Command handler: heating setpoint changes from Matter controller
  if (heatSetpointFeature) {
    endpoint.subscribeAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', (newValue: number) => {
      const fahrenheit = fromMatterCentiCelsius(newValue);
      ctx.onFeatureUpdate(heatSetpointFeature.id, fahrenheit);
    });
  }

  // Command handler: cooling setpoint changes from Matter controller
  if (coolSetpointFeature) {
    endpoint.subscribeAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', (newValue: number) => {
      const fahrenheit = fromMatterCentiCelsius(newValue);
      ctx.onFeatureUpdate(coolSetpointFeature.id, fahrenheit);
    });
  }

  const handlers = new Map<number, (value: number) => void>([
    [
      tempFeature.id,
      (value) => {
        endpoint.setAttribute(Thermostat.Cluster.id, 'localTemperature', toMatterCentiCelsius(value));
      },
    ],
  ]);

  if (modeFeature) {
    handlers.set(modeFeature.id, (value) => {
      endpoint.setAttribute(Thermostat.Cluster.id, 'systemMode', iotasModeToSystemMode(value));
    });
  }
  if (heatSetpointFeature) {
    handlers.set(heatSetpointFeature.id, (value) => {
      endpoint.setAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', toMatterCentiCelsius(value));
    });
  }
  if (coolSetpointFeature) {
    handlers.set(coolSetpointFeature.id, (value) => {
      endpoint.setAttribute(Thermostat.Cluster.id, 'occupiedCoolingSetpoint', toMatterCentiCelsius(value));
    });
  }

  return multiFeatureResult(endpoint, handlers);
}
