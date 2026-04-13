import { occupancySensor } from 'matterbridge';
import { OccupancySensing } from 'matterbridge/matter/clusters';

import { FeatureCategory, findFeatureByCategory, type Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';

export function addOccupancyChild(device: Device, result: EndpointResult, ctx: DeviceFactoryContext): EndpointResult {
  const motionFeature = findFeatureByCategory(device, FeatureCategory.Motion);

  if (!motionFeature) {
    ctx.log.debug(`Device ${device.name} has no motion feature, skipping occupancy child`);
    return result;
  }

  const occupied = (motionFeature.value ?? 0) === 1;

  const occupancyChild = result.endpoint
    .addChildDeviceType('Occupancy', occupancySensor)
    .createDefaultOccupancySensingClusterServer(occupied)
    .addRequiredClusterServers();

  const originalUpdate = result.updateAttribute.bind(result);

  return {
    endpoint: result.endpoint,
    featureIds: [...result.featureIds, motionFeature.id],
    updateAttribute(featureId, value) {
      if (featureId === motionFeature.id) {
        occupancyChild.setAttribute(OccupancySensing.Cluster.id, 'occupancy', { occupied: value === 1 });
      } else {
        originalUpdate(featureId, value);
      }
    },
  };
}
