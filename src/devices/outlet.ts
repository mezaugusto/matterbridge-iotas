import { onOffOutlet } from 'matterbridge';

import type { Device } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from './types.js';
import { createSimpleOnOffDevice } from './helpers.js';

export function createOnOffOutlet(device: Device, ctx: DeviceFactoryContext): EndpointResult | null {
  return createSimpleOnOffDevice(onOffOutlet, device, ctx, 'outlet');
}
