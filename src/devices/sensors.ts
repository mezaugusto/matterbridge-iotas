import { contactSensor, humiditySensor, occupancySensor } from 'matterbridge';
import { BooleanState, OccupancySensing, RelativeHumidityMeasurement } from 'matterbridge/matter/clusters';

import type { Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import {
  bridgedNode,
  createBridgedEndpoint,
  requireFeature,
  singleFeatureResult,
  toMatterHumidity,
} from './helpers.js';
import { FeatureType } from '../constants.js';

export function createHumiditySensor(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const humidityFeature = requireFeature(device, FeatureType.Humidity, ctx, 'humidity sensor');

  if (!humidityFeature) {
    return null;
  }

  const humidity = toMatterHumidity(humidityFeature.value ?? 0);

  const endpoint = createBridgedEndpoint([humiditySensor, bridgedNode], device, ctx)
    .createDefaultRelativeHumidityMeasurementClusterServer(humidity)
    .addRequiredClusterServers();

  return singleFeatureResult(endpoint, humidityFeature.id, (value) => {
    endpoint.setAttribute(RelativeHumidityMeasurement.Cluster.id, 'measuredValue', toMatterHumidity(value));
  });
}

export function createOccupancySensor(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const motionFeature = requireFeature(device, FeatureType.Motion, ctx, 'occupancy sensor');

  if (!motionFeature) {
    return null;
  }

  const occupied = (motionFeature.value ?? 0) === 1;

  const endpoint = createBridgedEndpoint([occupancySensor, bridgedNode], device, ctx)
    .createDefaultOccupancySensingClusterServer(occupied)
    .addRequiredClusterServers();

  return singleFeatureResult(endpoint, motionFeature.id, (value) => {
    endpoint.setAttribute(OccupancySensing.Cluster.id, 'occupancy', { occupied: value === 1 });
  });
}

export function createContactSensor(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  const doorFeature = requireFeature(device, FeatureType.DoorState, ctx, 'contact sensor');

  if (!doorFeature) {
    return null;
  }

  const contactState = (doorFeature.value ?? 0) === 1;

  const endpoint = createBridgedEndpoint([contactSensor, bridgedNode], device, ctx)
    .createDefaultBooleanStateClusterServer(contactState)
    .addRequiredClusterServers();

  return singleFeatureResult(endpoint, doorFeature.id, (value) => {
    endpoint.setAttribute(BooleanState.Cluster.id, 'stateValue', value === 1);
  });
}
