import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createEndpointForDevice } from '../src/deviceFactory.js';
import { assertResults, makeCtx, makeDevice, makeFeature } from './devices/helpers.js';

describe('createEndpointForDevice (router)', () => {
  const ctx = makeCtx();

  it('should skip unpaired devices', () => {
    const device = makeDevice({ paired: false });
    const results = createEndpointForDevice(device, ctx);
    assert.deepEqual(results, []);
  });

  it('should route dimmer with Level to dimmable light', () => {
    const device = makeDevice({
      category: 'dimmer',
      features: [
        makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 1 }),
        makeFeature({ id: 11, eventTypeName: 'Level', value: 0.5 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(10));
    assert.ok(results[0].featureIds.includes(11));
  });

  it('should route dimmer without Level to on/off light when isLight', () => {
    const device = makeDevice({
      category: 'dimmer',
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 1 })],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(10));
  });

  it('should route switch with isLight to on/off light', () => {
    const device = makeDevice({
      category: 'switch',
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 0 })],
    });
    const results = createEndpointForDevice(device, ctx);
    assert.equal(results.length, 1);
  });

  it('should route switch without isLight to outlet', () => {
    const device = makeDevice({
      category: 'switch',
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: false, value: 0 })],
    });
    const results = createEndpointForDevice(device, ctx);
    assert.equal(results.length, 1);
  });

  it('should route lock category', () => {
    const device = makeDevice({
      category: 'lock',
      features: [makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 })],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(20));
  });

  it('should route thermostat category', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 })],
    });
    const results = createEndpointForDevice(device, ctx);
    assert.ok(results.length >= 1);
    assert.ok(results[0].featureIds.includes(30));
  });

  it('should create multiple endpoints for thermostat with fan', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [
        makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 }),
        makeFeature({ id: 35, featureTypeCategory: 'fan_mode', eventTypeName: 'FanMode', value: 0 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 2);
    assert.ok(results[0].featureIds.includes(30));
    assert.ok(results[1].featureIds.includes(35));
  });

  it('should route door category to contact sensor', () => {
    const device = makeDevice({
      category: 'door',
      features: [makeFeature({ id: 60, featureTypeCategory: 'door_state', value: 1 })],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(60));
  });

  it('should detect humidity sensor by feature category', () => {
    const device = makeDevice({
      category: 'sensor',
      features: [makeFeature({ id: 40, featureTypeCategory: 'humidity', value: 0.5 })],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(40));
  });

  it('should detect motion sensor by feature category', () => {
    const device = makeDevice({
      category: 'sensor',
      features: [makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 })],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(50));
  });

  it('should return empty array for unsupported category', () => {
    const device = makeDevice({ category: 'unknown', features: [] });
    assert.deepEqual(createEndpointForDevice(device, ctx), []);
  });

  it('should prefer category handler over feature fallback', () => {
    const device = makeDevice({
      category: 'door',
      features: [
        makeFeature({ id: 60, featureTypeCategory: 'door_state', value: 1 }),
        makeFeature({ id: 40, featureTypeCategory: 'humidity', value: 0.5 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(60));
    assert.ok(!results[0].featureIds.includes(40));
  });

  it('should prefer humidity fallback over motion when both present', () => {
    const device = makeDevice({
      category: 'sensor',
      features: [
        makeFeature({ id: 40, featureTypeCategory: 'humidity', value: 0.5 }),
        makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(40));
  });

  it('should use first matching feature when duplicates exist', () => {
    const device = makeDevice({
      category: 'switch',
      features: [
        makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 0 }),
        makeFeature({ id: 11, eventTypeName: 'OnOff', isLight: true, value: 1 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(10));
  });

  it('should handle device with empty features for known category', () => {
    const device = makeDevice({ category: 'lock', features: [] });
    assert.deepEqual(createEndpointForDevice(device, ctx), []);
  });

  it('should handle device with no value on features', () => {
    const device = makeDevice({
      category: 'switch',
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: false })],
    });
    const results = createEndpointForDevice(device, ctx);
    assert.equal(results.length, 1);
  });

  it('should use serial number from device when long enough', () => {
    const device = makeDevice({
      category: 'switch',
      serialNumber: 'ABC123',
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 0 })],
    });
    const results = createEndpointForDevice(device, ctx);
    assert.equal(results.length, 1);
  });

  it('should use manufacturer info from physicalDeviceDescription', () => {
    const device = makeDevice({
      category: 'switch',
      physicalDeviceDescription: {
        id: 1,
        name: 'Smartplug',
        manufacturer: 'GE',
        model: 'ZW4103',
        protocol: 'Z-Wave',
        secure: false,
        movable: false,
        external: false,
        deviceSpecificKey: false,
        isActive: true,
      },
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: false, value: 0 })],
    });
    const results = createEndpointForDevice(device, ctx);
    assert.equal(results.length, 1);
  });
});
