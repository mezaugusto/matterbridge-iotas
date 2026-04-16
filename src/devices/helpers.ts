import { bridgedNode, MatterbridgeEndpoint } from 'matterbridge';
import type { DeviceTypeDefinition } from 'matterbridge';
import { OnOff } from 'matterbridge/matter/clusters';

import type { Device } from 'iotas-ts';
import {
  findFeatureByCategory,
  findFeatureByEventType,
  getManufacturer,
  getModel,
  getSerialNumber,
  Temperature,
} from 'iotas-ts';

import { EventTypeName, type FeatureCategory } from 'iotas-ts';
import { VENDOR_ID } from './types.js';
import type { DeviceFactoryContext, EndpointResult } from './types.js';

export { bridgedNode };

function makeDeviceId(device: Device): string {
  return `iotas-${device.id}`;
}

export function requireFeature(device: Device, category: FeatureCategory, ctx: DeviceFactoryContext, label: string) {
  const feature = findFeatureByCategory(device, category);
  if (!feature) {
    ctx.log.warn(`Device ${device.name} missing ${category} feature for ${label}`);
  }
  return feature ?? null;
}

function requireFeatureByEventType(
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

export function createBridgedEndpoint(
  deviceTypes: [DeviceTypeDefinition, ...DeviceTypeDefinition[]],
  device: Device,
  ctx: DeviceFactoryContext,
): MatterbridgeEndpoint {
  return new MatterbridgeEndpoint(deviceTypes, { id: makeDeviceId(device) }, ctx.debug)
    .createDefaultIdentifyClusterServer()
    .createDefaultBridgedDeviceBasicInformationClusterServer(
      device.name,
      getSerialNumber(device),
      VENDOR_ID,
      getManufacturer(device),
      getModel(device),
    );
}

export function toMatterLevel(iotasLevel: number): number {
  return Math.round(iotasLevel * 254);
}

export function fromMatterLevel(matterLevel: number): number {
  return matterLevel / 254;
}

export function toMatterHumidity(iotasHumidity: number): number {
  // Matter uses 0.01% units (0-10000 range for 0-100%)
  // IOTAS humidity is already a percentage (e.g., 43 for 43%)
  return Math.round(iotasHumidity * 100);
}

export function toCelsius(fahrenheit: number): number {
  return Temperature.toCelsius(fahrenheit);
}

export function toMatterCentiCelsius(fahrenheit: number): number {
  return Math.round(Temperature.toCelsius(fahrenheit) * 100);
}

export function fromMatterCentiCelsius(centiCelsius: number): number {
  return Temperature.toFahrenheit(centiCelsius / 100);
}

export function addOnOffHandlers(endpoint: MatterbridgeEndpoint, featureId: number, ctx: DeviceFactoryContext): void {
  endpoint.addCommandHandler('on', () => {
    ctx.onFeatureUpdate(featureId, 1);
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', true);
  });
  endpoint.addCommandHandler('off', () => {
    ctx.onFeatureUpdate(featureId, 0);
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false);
  });
}

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

export function createSimpleOnOffDevice(
  deviceType: DeviceTypeDefinition,
  device: Device,
  ctx: DeviceFactoryContext,
  label: string,
): EndpointResult | null {
  const onOffFeature = requireFeatureByEventType(device, EventTypeName.OnOff, ctx, label);

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
