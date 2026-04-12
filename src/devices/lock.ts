import { doorLockDevice } from 'matterbridge';
import { DoorLock, PowerSource } from 'matterbridge/matter/clusters';

import type { Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import { bridgedNode, createBridgedEndpoint, findFeature, multiFeatureResult, requireFeature } from './helpers.js';
import { FeatureType } from '../constants.js';

export function createDoorLock(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const lockFeature = requireFeature(device, FeatureType.Lock, ctx, 'door lock');

  if (!lockFeature) {
    return null;
  }

  const isLocked = (lockFeature.value ?? 0) === 1;
  const lockState = isLocked ? DoorLock.LockState.Locked : DoorLock.LockState.Unlocked;

  const endpoint = createBridgedEndpoint([doorLockDevice, bridgedNode], device, ctx)
    .createDefaultDoorLockClusterServer(lockState)
    .addRequiredClusterServers();

  endpoint.addCommandHandler('lockDoor', async () => {
    ctx.onFeatureUpdate(lockFeature.id, 1);
    await endpoint.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Locked);
  });

  endpoint.addCommandHandler('unlockDoor', async () => {
    ctx.onFeatureUpdate(lockFeature.id, 0);
    await endpoint.setAttribute(DoorLock.Cluster.id, 'lockState', DoorLock.LockState.Unlocked);
  });

  const handlers = new Map<number, (value: number) => void>([
    [lockFeature.id, (value) => {
      endpoint.setAttribute(
        DoorLock.Cluster.id,
        'lockState',
        value === 1 ? DoorLock.LockState.Locked : DoorLock.LockState.Unlocked,
      );
    }],
  ]);

  const batteryFeature = findFeature(device, FeatureType.Battery);
  if (batteryFeature) {
    const batteryLevel = Math.round((batteryFeature.value ?? 0) * 100);
    endpoint.createDefaultPowerSourceReplaceableBatteryClusterServer(
      batteryLevel,
      batteryLevel < 20 ? PowerSource.BatChargeLevel.Critical : PowerSource.BatChargeLevel.Ok,
      batteryLevel * 30,
      'CR123A',
      1,
      PowerSource.BatReplaceability.UserReplaceable,
    );
    handlers.set(batteryFeature.id, (value) => {
      const percent = Math.round(value * 100);
      endpoint.setAttribute(PowerSource.Cluster.id, 'batPercentRemaining', percent * 2);
      endpoint.setAttribute(
        PowerSource.Cluster.id,
        'batChargeLevel',
        percent < 20 ? PowerSource.BatChargeLevel.Critical : PowerSource.BatChargeLevel.Ok,
      );
    });
  }

  return multiFeatureResult(endpoint, handlers);
}
