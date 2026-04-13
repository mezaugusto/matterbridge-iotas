import { DeviceCategory, EventTypeName, FeatureCategory, isDeviceCategory, type Device } from 'iotas-ts';
import type { DeviceFactoryContext, EndpointResult } from './devices/types.js';
import { createDimmableLight, createOnOffLight } from './devices/lights.js';
import { createOnOffOutlet } from './devices/outlet.js';
import { createDoorLock } from './devices/lock.js';
import { createThermostat } from './devices/thermostat.js';
import { createHumiditySensor, createOccupancySensor, createContactSensor } from './devices/sensors.js';
import { addOccupancyChild } from './devices/motionSwitch.js';

type DeviceHandler = (device: Device, ctx: DeviceFactoryContext) => EndpointResult | EndpointResult[] | null;

function handleSwitch(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const isLight = device.features.some((f) => f.isLight);
  return isLight ? createOnOffLight(device, ctx) : createOnOffOutlet(device, ctx);
}

function handleMotionSwitch(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const result = handleSwitch(device, ctx);
  if (!result) {
    return null;
  }
  return addOccupancyChild(device, result, ctx);
}

function handleDimmer(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const hasLevel = device.features.some((f) => f.eventTypeName === EventTypeName.Level);
  if (hasLevel) {
    return createDimmableLight(device, ctx);
  }
  return handleSwitch(device, ctx);
}

const categoryHandlers = new Map<DeviceCategory, DeviceHandler>([
  [DeviceCategory.Dimmer, handleDimmer],
  [DeviceCategory.Switch, handleSwitch],
  [DeviceCategory.MotionSwitch, handleMotionSwitch],
  [DeviceCategory.Lock, createDoorLock],
  [DeviceCategory.Thermostat, createThermostat],
  [DeviceCategory.Door, createContactSensor],
]);

/**
 * Feature-based fallbacks for unknown categories.
 *
 * Precedence is defined by array order (first match wins):
 * 1) humidity
 * 2) motion
 */
const featureFallbacks: Array<{ category: FeatureCategory; handler: DeviceHandler }> = [
  { category: FeatureCategory.Humidity, handler: createHumiditySensor },
  { category: FeatureCategory.Motion, handler: createOccupancySensor },
];

/**
 * Main factory function - creates appropriate endpoint(s) based on device category.
\ */
export function createEndpointForDevice(device: Device, ctx: DeviceFactoryContext): EndpointResult[] {
  if (!device.paired) {
    ctx.log.debug(`Skipping unpaired device: ${device.name}`);
    return [];
  }

  if (isDeviceCategory(device.category)) {
    const handler = categoryHandlers.get(device.category);
    if (handler) {
      const result = handler(device, ctx);
      if (!result) {
        return [];
      }
      return Array.isArray(result) ? result : [result];
    }
  }

  for (const { category, handler: fallbackHandler } of featureFallbacks) {
    if (device.features.some((f) => f.featureTypeCategory === category)) {
      const result = fallbackHandler(device, ctx);
      if (!result) {
        return [];
      }
      return Array.isArray(result) ? result : [result];
    }
  }

  ctx.log.warn(`Unsupported device category: ${device.category} for device ${device.name}`);
  return [];
}
