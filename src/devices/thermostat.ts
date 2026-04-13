import { fanDevice, humiditySensor, MatterbridgeEndpoint, thermostatDevice } from 'matterbridge';
import { FanControl, RelativeHumidityMeasurement, Thermostat } from 'matterbridge/matter/clusters';

import {
  FeatureCategory,
  FanMode,
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

export function createThermostat(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const tempFeature = requireFeature(device, FeatureCategory.CurrentTemperature, ctx, 'thermostat');
  const modeFeature = findFeatureByCategory(device, FeatureCategory.ThermostatMode);
  const heatSetpointFeature = findFeatureByCategory(device, FeatureCategory.HeatSetPoint);
  const coolSetpointFeature = findFeatureByCategory(device, FeatureCategory.CoolSetPoint);
  const humidityFeature = findFeatureByCategory(device, FeatureCategory.Humidity);
  const fanModeFeature = findFeatureByCategory(device, FeatureCategory.FanMode);

  if (!tempFeature) {
    return null;
  }

  const currentTempC = toCelsius(tempFeature.value ?? DEFAULT_CURRENT_TEMPERATURE_F);
  const heatSetpointC = toCelsius(heatSetpointFeature?.value ?? DEFAULT_HEAT_SETPOINT_F);
  const coolSetpointC = toCelsius(coolSetpointFeature?.value ?? DEFAULT_COOL_SETPOINT_F);

  const endpoint = createBridgedEndpoint([thermostatDevice, bridgedNode], device, ctx)
    .createDefaultThermostatClusterServer(currentTempC, heatSetpointC, coolSetpointC)
    .addRequiredClusterServers();

  let humidityChild: MatterbridgeEndpoint | undefined;
  if (humidityFeature) {
    const humidity = toMatterHumidity(humidityFeature.value ?? 0);
    humidityChild = endpoint
      .addChildDeviceType('Humidity', humiditySensor)
      .createDefaultRelativeHumidityMeasurementClusterServer(humidity)
      .addRequiredClusterServers();
  }

  let fanChild: MatterbridgeEndpoint | undefined;
  if (fanModeFeature) {
    const matterFanMode = iotasFanModeToMatter(fanModeFeature.value ?? 0);
    fanChild = endpoint
      .addChildDeviceType('Fan', fanDevice)
      .createDefaultFanControlClusterServer(matterFanMode)
      .addRequiredClusterServers();
  }

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

  if (fanModeFeature && fanChild) {
    fanChild.subscribeAttribute(FanControl.Cluster.id, 'fanMode', (newValue: FanControl.FanMode) => {
      const iotasMode = matterFanModeToIotas(newValue);
      ctx.onFeatureUpdate(fanModeFeature.id, iotasMode);
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
  if (humidityFeature && humidityChild) {
    handlers.set(humidityFeature.id, (value) => {
      humidityChild.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', toMatterHumidity(value));
    });
  }
  if (fanModeFeature && fanChild) {
    handlers.set(fanModeFeature.id, (value) => {
      fanChild.setAttribute(FanControl.Cluster.id, 'fanMode', iotasFanModeToMatter(value));
    });
  }

  return multiFeatureResult(endpoint, handlers);
}
