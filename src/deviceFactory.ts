/**
 * Device Factory - Router that maps IOTAS device categories to factory functions.
 *
 * Individual device factories live in src/devices/.
 * This module provides createEndpointForDevice (the router).
 */

import { DeviceCategory, EventTypeName, FeatureCategory, isDeviceCategory, type Device } from 'iotas-ts';
import type { DeviceFactoryContext, EndpointResult } from './devices/types.js';
import { createDimmableLight, createOnOffLight } from './devices/lights.js';
import { createOnOffOutlet } from './devices/outlet.js';
import { createDoorLock } from './devices/lock.js';
import { createThermostat } from './devices/thermostat.js';
import { createHumiditySensor, createOccupancySensor, createContactSensor } from './devices/sensors.js';

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

type DeviceHandler = (device: Device, ctx: DeviceFactoryContext) => EndpointResult | null;

function handleSwitch(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const isLight = device.features.some((f) => f.isLight);
  return isLight ? createOnOffLight(device, ctx) : createOnOffOutlet(device, ctx);
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
  [DeviceCategory.MotionSwitch, handleSwitch],
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
 * Main factory function - creates appropriate endpoint based on device category.
 */
export function createEndpointForDevice(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  if (!device.paired) {
    ctx.log.debug(`Skipping unpaired device: ${device.name}`);
    return null;
  }

  if (isDeviceCategory(device.category)) {
    const handler = categoryHandlers.get(device.category);
    if (handler) {
      return handler(device, ctx);
    }
  }

  for (const { category, handler: fallbackHandler } of featureFallbacks) {
    if (device.features.some((f) => f.featureTypeCategory === category)) {
      return fallbackHandler(device, ctx);
    }
  }

  ctx.log.warn(`Unsupported device category: ${device.category} for device ${device.name}`);
  return null;
}
