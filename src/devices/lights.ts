import { dimmableLight, onOffLight } from 'matterbridge';
import { LevelControl, OnOff } from 'matterbridge/matter/clusters';

import { EventTypeName, findFeatureByEventType, type Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import {
  addOnOffHandlers,
  bridgedNode,
  createBridgedEndpoint,
  createSimpleOnOffDevice,
  fromMatterLevel,
  multiFeatureResult,
  singleFeatureResult,
  toMatterLevel,
} from './helpers.js';

// Matter LevelControl with Lighting feature constrains currentLevel to [minLevel, maxLevel].
// Defaults: minLevel=1, maxLevel=254. The on/off state is represented by the OnOff cluster.
const MATTER_MIN_LEVEL = 1;
const MATTER_MAX_LEVEL = 254;

function clampLevel(level: number): number {
  return Math.max(Math.min(level, MATTER_MAX_LEVEL), MATTER_MIN_LEVEL);
}

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

  const handleLevel = ({ request }: { request: { level: number } }) => {
    const matterLevel = request.level;
    const iotasLevel = fromMatterLevel(matterLevel);
    ctx.onFeatureUpdate(levelFeature.id, iotasLevel);
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', clampLevel(matterLevel));
  };
  endpoint.addCommandHandler('moveToLevel', handleLevel);
  endpoint.addCommandHandler('moveToLevelWithOnOff', handleLevel);

  return multiFeatureResult(
    endpoint,
    new Map([
      [onOffFeature.id, (value) => endpoint.setAttribute(OnOff.Cluster.id, 'onOff', value === 1)],
      [
        levelFeature.id,
        (value) => endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', clampLevel(toMatterLevel(value))),
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
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', MATTER_MAX_LEVEL);
  });
  endpoint.addCommandHandler('off', () => {
    ctx.onFeatureUpdate(levelFeature.id, 0);
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', false);
  });

  // moveToLevel doesn't affect onOff in Matterbridge, so we must set it ourselves for level-only devices
  endpoint.addCommandHandler('moveToLevel', ({ request }) => {
    const matterLevel = request.level;
    const iotasLevel = fromMatterLevel(matterLevel);
    ctx.onFeatureUpdate(levelFeature.id, iotasLevel);
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', clampLevel(matterLevel));
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', matterLevel > 0);
  });
  // moveToLevelWithOnOff: Matterbridge's couple() sets onOff internally, so we only set currentLevel
  endpoint.addCommandHandler('moveToLevelWithOnOff', ({ request }) => {
    const matterLevel = request.level;
    const iotasLevel = fromMatterLevel(matterLevel);
    ctx.onFeatureUpdate(levelFeature.id, iotasLevel);
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', clampLevel(matterLevel));
  });

  return singleFeatureResult(endpoint, levelFeature.id, (value) => {
    endpoint.setAttribute(LevelControl.Cluster.id, 'currentLevel', clampLevel(toMatterLevel(value)));
    endpoint.setAttribute(OnOff.Cluster.id, 'onOff', value > 0);
  });
}

export function createDimmableLight(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const onOffFeature = findFeatureByEventType(device, EventTypeName.OnOff);
  const levelFeature = findFeatureByEventType(device, EventTypeName.Level);

  if (!levelFeature) {
    ctx.log.warn(`Device ${device.name} missing Level feature for dimmable light`);
    return null;
  }

  const level = clampLevel(toMatterLevel(levelFeature.value ?? 0));

  if (onOffFeature) {
    return createStandardDimmableLight(device, ctx, onOffFeature, levelFeature, level);
  }

  return createLevelOnlyDimmableLight(device, ctx, levelFeature, level);
}

export function createOnOffLight(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  return createSimpleOnOffDevice(onOffLight, device, ctx, 'light');
}
