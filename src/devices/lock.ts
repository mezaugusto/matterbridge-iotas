import { doorLockDevice } from 'matterbridge';
import { DoorLock, PowerSource } from 'matterbridge/matter/clusters';

import {
  FeatureCategory,
  findFeatureByCategory,
  autoRelockSeconds,
  isAutoRelockEnabled,
  isLockedAlarm,
  LOW_BATTERY_THRESHOLD,
  type Device,
} from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import { bridgedNode, createBridgedEndpoint, multiFeatureResult, requireFeature } from './helpers.js';

export function createDoorLock(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const lockFeature = requireFeature(device, FeatureCategory.Lock, ctx, 'door lock');

  if (!lockFeature) {
    return null;
  }

  const isLocked = (lockFeature.value ?? 0) === 1;
  const lockState = isLocked ? DoorLock.LockState.Locked : DoorLock.LockState.Unlocked;

  const autoRelockFeature = findFeatureByCategory(device, FeatureCategory.AutoRelock);
  const autoRelockTimeoutFeature = findFeatureByCategory(device, FeatureCategory.AutoRelockTimeout);

  const autoRelockTime = autoRelockSeconds(autoRelockFeature?.value ?? 0, autoRelockTimeoutFeature?.value ?? 0);

  const endpoint = createBridgedEndpoint([doorLockDevice, bridgedNode], device, ctx)
    .createDefaultDoorLockClusterServer(lockState, DoorLock.LockType.DeadBolt, autoRelockTime)
    .addRequiredClusterServers();

  endpoint.addCommandHandler('lockDoor', () => {
    ctx.onFeatureUpdate(lockFeature.id, 1);
    endpoint.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Locked);
  });

  endpoint.addCommandHandler('unlockDoor', () => {
    ctx.onFeatureUpdate(lockFeature.id, 0);
    endpoint.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Unlocked);
  });

  if (autoRelockFeature && autoRelockTimeoutFeature) {
    endpoint.subscribeAttribute(DoorLock.Cluster.id, 'autoRelockTime', (newValue: number) => {
      ctx.onFeatureUpdate(autoRelockFeature.id, isAutoRelockEnabled(newValue));
      if (newValue > 0) {
        ctx.onFeatureUpdate(autoRelockTimeoutFeature.id, newValue);
      }
    });
  }

  const handlers = new Map<number, (value: number) => void>([
    [
      lockFeature.id,
      (value) => {
        endpoint.setAttribute(
          DoorLock.Cluster.id,
          'lockState',
          value === 1 ? DoorLock.LockState.Locked : DoorLock.LockState.Unlocked,
        );
      },
    ],
  ]);

  const batteryFeature = findFeatureByCategory(device, FeatureCategory.Battery);
  if (batteryFeature) {
    const batteryPercent = Math.min(Math.round(batteryFeature.value ?? 0), 100);
    const matterPercent = batteryPercent * 2; // Matter uses 0-200 (0.5% steps)
    endpoint.createDefaultPowerSourceReplaceableBatteryClusterServer(
      matterPercent,
      batteryPercent < LOW_BATTERY_THRESHOLD ? PowerSource.BatChargeLevel.Critical : PowerSource.BatChargeLevel.Ok,
      batteryPercent * 30,
      'CR123A',
      1,
      PowerSource.BatReplaceability.UserReplaceable,
    );
    handlers.set(batteryFeature.id, (value) => {
      const percent = Math.min(Math.round(value), 100);
      endpoint.setAttribute(PowerSource.Cluster.id, 'batPercentRemaining', percent * 2);
      endpoint.setAttribute(
        PowerSource.Cluster.id,
        'batChargeLevel',
        percent < LOW_BATTERY_THRESHOLD ? PowerSource.BatChargeLevel.Critical : PowerSource.BatChargeLevel.Ok,
      );
    });
  }

  if (autoRelockFeature && autoRelockTimeoutFeature) {
    let lastEnabled = autoRelockFeature.value ?? 0;
    let lastTimeout = autoRelockTimeoutFeature.value ?? 0;

    handlers.set(autoRelockFeature.id, (value) => {
      lastEnabled = value;
      endpoint.setAttribute(DoorLock.Cluster.id, 'autoRelockTime', autoRelockSeconds(lastEnabled, lastTimeout));
    });
    handlers.set(autoRelockTimeoutFeature.id, (value) => {
      lastTimeout = value;
      endpoint.setAttribute(DoorLock.Cluster.id, 'autoRelockTime', autoRelockSeconds(lastEnabled, lastTimeout));
    });
  }

  const doorLockStateFeatures = device.features.filter(
    (f) => f.featureTypeCategory === FeatureCategory.DoorLockState && f.value !== undefined,
  );
  for (const dlsFeature of doorLockStateFeatures) {
    handlers.set(dlsFeature.id, (value) => {
      const locked = isLockedAlarm(value);
      if (locked !== null) {
        endpoint.setAttribute(
          DoorLock.Cluster.id,
          'lockState',
          locked ? DoorLock.LockState.Locked : DoorLock.LockState.Unlocked,
        );
      }
    });
  }

  return multiFeatureResult(endpoint, handlers);
}
