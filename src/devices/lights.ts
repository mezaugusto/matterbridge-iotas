import { dimmableLight, onOffLight } from 'matterbridge';
import { LevelControl, OnOff } from 'matterbridge/matter/clusters';

import type { Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import {
  addOnOffHandlers,
  bridgedNode,
  createBridgedEndpoint,
  createSimpleOnOffDevice,
  fromMatterLevel,
  multiFeatureResult,
  requireFeatureByEventType,
  toMatterLevel,
} from './helpers.js';
import { EventType } from '../constants.js';

export function createDimmableLight(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const onOffFeature = requireFeatureByEventType(device, EventType.OnOff, ctx, 'dimmable light');
  const levelFeature = requireFeatureByEventType(device, EventType.Level, ctx, 'dimmable light');

  if (!onOffFeature || !levelFeature) {
    return null;
  }

  const isOn = (onOffFeature.value ?? 0) === 1;
  const level = toMatterLevel(levelFeature.value ?? 0);

  const endpoint = createBridgedEndpoint([dimmableLight, bridgedNode], device, ctx)
    .createDefaultOnOffClusterServer(isOn)
    .createDefaultLevelControlClusterServer(level)
    .addRequiredClusterServers();

  addOnOffHandlers(endpoint, onOffFeature.id, ctx);

  endpoint.addCommandHandler('moveToLevel', async ({ request }) => {
    const matterLevel = request.level;
    const iotasLevel = fromMatterLevel(matterLevel);
    await ctx.onFeatureUpdate(levelFeature.id, iotasLevel);
    await endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', matterLevel);
  });

  return multiFeatureResult(endpoint, new Map([
    [onOffFeature.id, (value) => endpoint.setAttribute(OnOff.Cluster.id, 'onOff', value === 1)],
    [levelFeature.id, (value) => endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', toMatterLevel(value))],
  ]));
}

export function createOnOffLight(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  return createSimpleOnOffDevice(onOffLight, device, ctx, 'light');
}
