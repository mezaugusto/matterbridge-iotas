import { fanDevice, humiditySensor, MatterbridgeEndpoint, thermostatDevice } from 'matterbridge';
import { FanControl, RelativeHumidityMeasurement, Thermostat } from 'matterbridge/matter/clusters';

import {
  FeatureCategory,
  FanMode,
  ThermostatMode,
  findFeatureByCategory,
  getManufacturer,
  getModel,
  getSerialNumber,
  DEFAULT_CURRENT_TEMPERATURE_F,
  DEFAULT_HEAT_SETPOINT_F,
  DEFAULT_COOL_SETPOINT_F,
  type Device,
} from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import { VENDOR_ID } from './types.js';
import {
  bridgedNode,
  createBridgedEndpoint,
  fromMatterCentiCelsius,
  multiFeatureResult,
  requireFeature,
  singleFeatureResult,
  toCelsius,
  toMatterCentiCelsius,
  toMatterHumidity,
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

/**
 * Map IOTAS FanMode to Matter FanControl.FanMode.
 * IOTAS: 0=Auto Low, 1=On Low, 2=Circulate
 * Matter: Off=0, Low=1, Medium=2, High=3, On=4, Auto=5
 */
export function iotasFanModeToMatter(iotasMode: number): FanControl.FanMode {
  const mode = iotasMode as FanMode;
  switch (mode) {
    case FanMode.AutoLow:
      return FanControl.FanMode.Auto;
    case FanMode.OnLow:
      return FanControl.FanMode.Low;
    case FanMode.Circulate:
      return FanControl.FanMode.On;
    default:
      return FanControl.FanMode.Auto;
  }
}

function matterFanModeToIotas(matterMode: FanControl.FanMode): FanMode {
  switch (matterMode) {
    case FanControl.FanMode.Auto:
      return FanMode.AutoLow;
    case FanControl.FanMode.Low:
      return FanMode.OnLow;
    case FanControl.FanMode.On:
    case FanControl.FanMode.High:
    case FanControl.FanMode.Medium:
      return FanMode.Circulate;
    default:
      return FanMode.AutoLow;
  }
}

function createHumidityEndpoint(
  device: Device,
  ctx: DeviceFactoryContext,
  humidityFeature: { id: number; value?: number | null },
): EndpointResult {
  const humidity = toMatterHumidity(humidityFeature.value ?? 0);

  const humidityEndpoint = new MatterbridgeEndpoint(
    [humiditySensor, bridgedNode],
    { id: `iotas-${device.id}-humidity` },
    ctx.debug,
  )
    .createDefaultIdentifyClusterServer()
    .createDefaultBridgedDeviceBasicInformationClusterServer(
      `${device.name} Humidity`,
      `${getSerialNumber(device)}-humidity`,
      VENDOR_ID,
      getManufacturer(device),
      getModel(device),
    )
    .createDefaultRelativeHumidityMeasurementClusterServer(humidity)
    .addRequiredClusterServers();

  return singleFeatureResult(humidityEndpoint, humidityFeature.id, (value) => {
    humidityEndpoint.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', toMatterHumidity(value));
  });
}

function createFanEndpoint(
  device: Device,
  ctx: DeviceFactoryContext,
  fanModeFeature: { id: number; value?: number | null },
): EndpointResult {
  const matterFanMode = iotasFanModeToMatter(fanModeFeature.value ?? 0);

  const fanEndpoint = new MatterbridgeEndpoint([fanDevice, bridgedNode], { id: `iotas-${device.id}-fan` }, ctx.debug)
    .createDefaultIdentifyClusterServer()
    .createDefaultBridgedDeviceBasicInformationClusterServer(
      `${device.name} Fan`,
      `${getSerialNumber(device)}-fan`,
      VENDOR_ID,
      getManufacturer(device),
      getModel(device),
    )
    .createDefaultFanControlClusterServer(matterFanMode)
    .addRequiredClusterServers();

  fanEndpoint.subscribeAttribute(FanControl.Cluster.id, 'fanMode', (newValue: FanControl.FanMode) => {
    const iotasMode = matterFanModeToIotas(newValue);
    ctx.onFeatureUpdate(fanModeFeature.id, iotasMode);
  });

  return singleFeatureResult(fanEndpoint, fanModeFeature.id, (value) => {
    fanEndpoint.setAttribute(FanControl.Cluster.id, 'fanMode', iotasFanModeToMatter(value));
  });
}

/**
 * Create endpoints for a thermostat device.
 * All are top-level bridged endpoints (no child device types) to avoid stored structure conflicts.
 */
export function createThermostat(device: Device, ctx: DeviceFactoryContext): EndpointResult[] {
  const tempFeature = requireFeature(device, FeatureCategory.CurrentTemperature, ctx, 'thermostat');
  const modeFeature = findFeatureByCategory(device, FeatureCategory.ThermostatMode);
  const heatSetpointFeature = findFeatureByCategory(device, FeatureCategory.HeatSetPoint);
  const coolSetpointFeature = findFeatureByCategory(device, FeatureCategory.CoolSetPoint);
  const humidityFeature = findFeatureByCategory(device, FeatureCategory.Humidity);
  const fanModeFeature = findFeatureByCategory(device, FeatureCategory.FanMode);

  if (!tempFeature) {
    return [];
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

  const results: EndpointResult[] = [multiFeatureResult(endpoint, handlers)];

  if (humidityFeature) {
    results.push(createHumidityEndpoint(device, ctx, humidityFeature));
  }
  if (fanModeFeature) {
    results.push(createFanEndpoint(device, ctx, fanModeFeature));
  }

  return results;
}
