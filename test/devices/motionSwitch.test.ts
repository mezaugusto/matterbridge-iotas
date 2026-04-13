import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertResults, makeCtx, makeDevice, makeFeature, suppressLogs } from './helpers.js';

import { createEndpointForDevice } from '../../src/deviceFactory.js';

describe('addOccupancyChild', () => {
  const ctx = makeCtx();

  it('should add occupancy child when motion feature exists', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [
        makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 1 }),
        makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(10), 'should include onOff feature');
    assert.ok(results[0].featureIds.includes(50), 'should include motion feature');
  });

  it('should work without motion feature (returns light only)', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 0 })],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(10));
    assert.ok(!results[0].featureIds.includes(50), 'should not include motion feature');
  });

  it('should create outlet with occupancy for non-light motion switch', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [
        makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: false, value: 0 }),
        makeFeature({ id: 50, featureTypeCategory: 'motion', value: 1 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    assert.ok(results[0].featureIds.includes(10));
    assert.ok(results[0].featureIds.includes(50));
  });

  it('should delegate non-motion updates to original handler', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [
        makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 1 }),
        makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 }),
      ],
    });
    const results = assertResults(createEndpointForDevice(device, ctx), 1);
    suppressLogs(() => {
      results[0].updateAttribute(10, 0);
      results[0].updateAttribute(50, 1);
    });
  });

  it('should return empty array when switch has no OnOff feature', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 })],
    });
    const results = createEndpointForDevice(device, ctx);
    assert.deepEqual(results, []);
  });
});
