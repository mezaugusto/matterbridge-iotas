import { dimmableLight, onOffLight } from 'matterbridge';
import { LevelControl, OnOff } from 'matterbridge/matter/clusters';

import type { Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import {
  addOnOffHandlers,
  bridgedNode,
  createBridgedEndpoint,
  createSimpleOnOffDevice,
  findFeatureByEventType,
  fromMatterLevel,
  multiFeatureResult,
  singleFeatureResult,
  toMatterLevel,
} from './helpers.js';
import { EventType } from '../constants.js';

function createStandardDimmableLight(
  device: Device,
  ctx: DeviceFactoryContext,
  onOffFeature: { id: number; value?: number },
  levelFeature: { id: number },
  level: number,
): EndpointResult {
  const isOn = (onOffFeature.value ?? 0) === 1;

  const endpoint = createBridgedEndpoint([dimmableLight, bridgedNode], device, ctx)
    .createDefaultOnOffClusterServer(isOn)
    .createDefaultLevelControlClusterServer(level)
    .addRequiredClusterServers();

  addOnOffHandlers(endpoint, onOffFeature.id, ctx);

  endpoint.addCommandHandler('moveToLevel', ({ request }) => {
    const matterLevel = request.level;
    const iotasLevel = fromMatterLevel(matterLevel);
    ctx.onFeatureUpdate(levelFeature.id, iotasLevel);
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', matterLevel);
  });

  return multiFeatureResult(
    endpoint,
    new Map([
      [onOffFeature.id, (value) => endpoint.setAttribute(OnOff.Cluster.id, 'onOff', value === 1)],
      [
        levelFeature.id,
        (value) => endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', toMatterLevel(value)),
      ],
    ]),
  );
}

function createLevelOnlyDimmableLight(
  device: Device,
  ctx: DeviceFactoryContext,
  levelFeature: { id: number; value?: number },
  level: number,
): EndpointResult {
  const isOn = (levelFeature.value ?? 0) > 0;

  const endpoint = createBridgedEndpoint([dimmableLight, bridgedNode], device, ctx)
    .createDefaultOnOffClusterServer(isOn)
    .createDefaultLevelControlClusterServer(level)
    .addRequiredClusterServers();

  // On/off synthesized from level — send level value to the single IOTAS feature
  endpoint.addCommandHandler('on', () => {
    ctx.onFeatureUpdate(levelFeature.id, 1);
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', true);
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', 254);
  });
  endpoint.addCommandHandler('off', () => {
    ctx.onFeatureUpdate(levelFeature.id, 0);
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false);
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', 0);
  });

  endpoint.addCommandHandler('moveToLevel', ({ request }) => {
    const matterLevel = request.level;
    const iotasLevel = fromMatterLevel(matterLevel);
    ctx.onFeatureUpdate(levelFeature.id, iotasLevel);
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', matterLevel);
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', matterLevel > 0);
  });

  return singleFeatureResult(endpoint, levelFeature.id, (value) => {
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', toMatterLevel(value));
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', value > 0);
  });
}

export function createDimmableLight(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const onOffFeature = findFeatureByEventType(device, EventType.OnOff);
  const levelFeature = findFeatureByEventType(device, EventType.Level);

  if (!levelFeature) {
    ctx.log.warn(`Device ${device.name} missing Level feature for dimmable light`);
    return null;
  }

  const level = toMatterLevel(levelFeature.value ?? 0);

  if (onOffFeature) {
    return createStandardDimmableLight(device, ctx, onOffFeature, levelFeature, level);
  }

  return createLevelOnlyDimmableLight(device, ctx, levelFeature, level);
}

export function createOnOffLight(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  return createSimpleOnOffDevice(onOffLight, device, ctx, 'light');
}
