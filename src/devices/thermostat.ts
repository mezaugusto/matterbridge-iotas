import { thermostatDevice } from 'matterbridge';
import { Thermostat } from 'matterbridge/matter/clusters';

import {
  FeatureCategory,
  ThermostatMode,
  findFeatureByCategory,
  DEFAULT_CURRENT_TEMPERATURE_F,
  DEFAULT_HEAT_SETPOINT_F,
  DEFAULT_COOL_SETPOINT_F,
  type Device,
} from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import {
  bridgedNode,
  createBridgedEndpoint,
  fromMatterCentiCelsius,
  multiFeatureResult,
  requireFeature,
  toCelsius,
  toMatterCentiCelsius,
} from './helpers.js';

/**
 * Map IOTAS thermostat mode values to Matter SystemMode.
 * ThermostatMode enum values match IOTAS indices: 0=Off, 1=Heat, 2=Cool, 3=EmergencyHeat, 4=Auto
 */
export function iotasModeToSystemMode(iotasMode: number): Thermostat.SystemMode {
  const mode = iotasMode as ThermostatMode;
  switch (mode) {
    case ThermostatMode.Heat:
      return Thermostat.SystemMode.Heat;
    case ThermostatMode.Cool:
      return Thermostat.SystemMode.Cool;
    case ThermostatMode.EmergencyHeat:
      return Thermostat.SystemMode.EmergencyHeat;
    case ThermostatMode.Auto:
      return Thermostat.SystemMode.Auto;
    default:
      return Thermostat.SystemMode.Off;
  }
}

function systemModeToIotasMode(systemMode: Thermostat.SystemMode): ThermostatMode {
  switch (systemMode) {
    case Thermostat.SystemMode.Heat:
      return ThermostatMode.Heat;
    case Thermostat.SystemMode.Cool:
      return ThermostatMode.Cool;
    case Thermostat.SystemMode.EmergencyHeat:
      return ThermostatMode.EmergencyHeat;
    case Thermostat.SystemMode.Auto:
      return ThermostatMode.Auto;
    default:
      return ThermostatMode.Off;
  }
}

export function createThermostat(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const tempFeature = requireFeature(device, FeatureCategory.CurrentTemperature, ctx, 'thermostat');
  const modeFeature = findFeatureByCategory(device, FeatureCategory.ThermostatMode);
  const heatSetpointFeature = findFeatureByCategory(device, FeatureCategory.HeatSetPoint);
  const coolSetpointFeature = findFeatureByCategory(device, FeatureCategory.CoolSetPoint);

  if (!tempFeature) {
    return null;
  }

  const currentTempC = toCelsius(tempFeature.value ?? DEFAULT_CURRENT_TEMPERATURE_F);
  const heatSetpointC = toCelsius(heatSetpointFeature?.value ?? DEFAULT_HEAT_SETPOINT_F);
  const coolSetpointC = toCelsius(coolSetpointFeature?.value ?? DEFAULT_COOL_SETPOINT_F);

  const endpoint = createBridgedEndpoint([thermostatDevice, bridgedNode], device, ctx)
    .createDefaultThermostatClusterServer(currentTempC, heatSetpointC, coolSetpointC)
    .addRequiredClusterServers();

  if (modeFeature) {
    endpoint.subscribeAttribute(Thermostat.Cluster.id, 'systemMode', (newValue: Thermostat.SystemMode) => {
      const iotasMode = systemModeToIotasMode(newValue);
      ctx.onFeatureUpdate(modeFeature.id, iotasMode);
    });
  }

  if (heatSetpointFeature) {
    endpoint.subscribeAttribute(Thermostat.Cluster.id, 'occupiedHeatingSetpoint', (newValue: number) => {
      const fahrenheit = fromMatterCentiCelsius(newValue);
      ctx.onFeatureUpdate(heatSetpointFeature.id, fahrenheit);
    });
  }

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
