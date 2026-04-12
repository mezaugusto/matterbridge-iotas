/**
 * Shared helpers for device factories.
 */

import { bridgedNode, MatterbridgeEndpoint } from 'matterbridge';
import type { DeviceTypeDefinition } from 'matterbridge';
import { OnOff } from 'matterbridge/matter/clusters';

import type { Device } from 'iotas-ts';
import { Temperature } from 'iotas-ts';

import type { EventTypeName, FeatureCategory } from '../constants.js';
import { EventType } from '../constants.js';
import { VENDOR_ID } from './types.js';
import type { DeviceFactoryContext, EndpointResult } from './types.js';

export { bridgedNode };

export function makeDeviceId(device: Device): string {
  return `iotas-${device.id}`;
}

export function getSerialNumber(device: Device): string {
  if (device.serialNumber && device.serialNumber.length > 1) {
    return device.serialNumber;
  }
  return `IOTAS-${device.id}`;
}

export function getManufacturerInfo(device: Device): { manufacturer: string; model: string } {
  return {
    manufacturer: device.physicalDeviceDescription?.manufacturer ?? 'IOTAS',
    model: device.physicalDeviceDescription?.model ?? device.category,
  };
}

export function findFeature(device: Device, category: FeatureCategory) {
  return device.features.find((f) => f.featureTypeCategory === category);
}

export function findFeatureByEventType(device: Device, eventTypeName: EventTypeName) {
  return device.features.find((f) => f.eventTypeName === eventTypeName);
}

/** Find a feature by category or return null with a warning log. */
export function requireFeature(device: Device, category: FeatureCategory, ctx: DeviceFactoryContext, label: string) {
  const feature = findFeature(device, category);
  if (!feature) {
    ctx.log.warn(`Device ${device.name} missing ${category} feature for ${label}`);
  }
  return feature ?? null;
}

/** Find a feature by event type or return null with a warning log. */
export function requireFeatureByEventType(
  device: Device,
  eventTypeName: EventTypeName,
  ctx: DeviceFactoryContext,
  label: string,
) {
  const feature = findFeatureByEventType(device, eventTypeName);
  if (!feature) {
    ctx.log.warn(`Device ${device.name} missing ${eventTypeName} feature for ${label}`);
  }
  return feature ?? null;
}

/**
 * Create a MatterbridgeEndpoint pre-configured with identify + bridged device basic info.
 */
export function createBridgedEndpoint(
  deviceTypes: [DeviceTypeDefinition, ...DeviceTypeDefinition[]],
  device: Device,
  ctx: DeviceFactoryContext,
): MatterbridgeEndpoint {
  const { manufacturer, model } = getManufacturerInfo(device);
  return new MatterbridgeEndpoint(deviceTypes, { id: makeDeviceId(device) }, ctx.debug)
    .createDefaultIdentifyClusterServer()
    .createDefaultBridgedDeviceBasicInformationClusterServer(
      device.name,
      getSerialNumber(device),
      VENDOR_ID,
      manufacturer,
      model,
    );
}

/** Convert IOTAS level (0..1) to Matter level (0..254). */
export function toMatterLevel(iotasLevel: number): number {
  return Math.round(iotasLevel * 254);
}

/** Convert Matter level (0..254) to IOTAS level (0..1). */
export function fromMatterLevel(matterLevel: number): number {
  return matterLevel / 254;
}

/** Convert IOTAS humidity (0..1) to Matter centipercent (0..10000). */
export function toMatterHumidity(iotasHumidity: number): number {
  return Math.round(iotasHumidity * 10000);
}

/** Convert Fahrenheit to degrees Celsius. */
export function toCelsius(fahrenheit: number): number {
  return Temperature.toCelsius(fahrenheit);
}

/** Convert Fahrenheit to Matter centidegrees Celsius (raw attribute value, 1/100 °C). */
export function toMatterCentiCelsius(fahrenheit: number): number {
  return Math.round(Temperature.toCelsius(fahrenheit) * 100);
}

/** Convert Matter centidegrees Celsius back to Fahrenheit. */
export function fromMatterCentiCelsius(centiCelsius: number): number {
  return Temperature.toFahrenheit(centiCelsius / 100);
}

/**
 * Add standard on/off command handlers to an endpoint.
 */
export function addOnOffHandlers(endpoint: MatterbridgeEndpoint, featureId: number, ctx: DeviceFactoryContext): void {
  endpoint.addCommandHandler('on', async () => {
    await ctx.onFeatureUpdate(featureId, 1);
    await endpoint.setAttribute(OnOff.Cluster.id, 'onOff', true);
  });
  endpoint.addCommandHandler('off', async () => {
    await ctx.onFeatureUpdate(featureId, 0);
    await endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false);
  });
}

/**
 * Build an EndpointResult for a device that tracks multiple IOTAS features.
 * Feature IDs are derived from the map keys; updateAttribute dispatches via lookup.
 */
export function multiFeatureResult(
  endpoint: MatterbridgeEndpoint,
  handlers: Map<number, (value: number) => void>,
): EndpointResult {
  return {
    endpoint,
    featureIds: [...handlers.keys()],
    updateAttribute(featureId, value) {
      handlers.get(featureId)?.(value);
    },
  };
}
export function singleFeatureResult(
  endpoint: MatterbridgeEndpoint,
  featureId: number,
  onUpdate: (value: number) => void,
): EndpointResult {
  return {
    endpoint,
    featureIds: [featureId],
    updateAttribute(fid, value) {
      if (fid === featureId) {
        onUpdate(value);
      }
    },
  };
}

/**
 * Create a simple on/off device (light or outlet) — shared logic for
 * createOnOffLight and createOnOffOutlet.
 */
export function createSimpleOnOffDevice(
  deviceType: DeviceTypeDefinition,
  device: Device,
  ctx: DeviceFactoryContext,
  label: string,
): EndpointResult | null {
  const onOffFeature = requireFeatureByEventType(device, EventType.OnOff, ctx, label);

  if (!onOffFeature) {
    return null;
  }

  const isOn = (onOffFeature.value ?? 0) === 1;

  const endpoint = createBridgedEndpoint([deviceType, bridgedNode], device, ctx)
    .createDefaultOnOffClusterServer(isOn)
    .addRequiredClusterServers();

  addOnOffHandlers(endpoint, onOffFeature.id, ctx);

  return singleFeatureResult(endpoint, onOffFeature.id, (value) => {
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', value === 1);
  });
}
