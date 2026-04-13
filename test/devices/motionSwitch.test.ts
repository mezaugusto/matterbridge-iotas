import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertResult, makeCtx, makeDevice, makeFeature, suppressLogs } from './helpers.js';

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
    const result = assertResult(createEndpointForDevice(device, ctx));
    assert.ok(result.featureIds.includes(10), 'should include onOff feature');
    assert.ok(result.featureIds.includes(50), 'should include motion feature');
  });

  it('should work without motion feature (returns light only)', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 0 })],
    });
    const result = assertResult(createEndpointForDevice(device, ctx));
    assert.ok(result.featureIds.includes(10));
    assert.ok(!result.featureIds.includes(50), 'should not include motion feature');
  });

  it('should create outlet with occupancy for non-light motion switch', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [
        makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: false, value: 0 }),
        makeFeature({ id: 50, featureTypeCategory: 'motion', value: 1 }),
      ],
    });
    const result = assertResult(createEndpointForDevice(device, ctx));
    assert.ok(result.featureIds.includes(10));
    assert.ok(result.featureIds.includes(50));
  });

  it('should delegate non-motion updates to original handler', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [
        makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 1 }),
        makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 }),
      ],
    });
    const result = assertResult(createEndpointForDevice(device, ctx));
    // updateAttribute for onOff should not throw (delegates to original)
    suppressLogs(() => {
      result.updateAttribute(10, 0);
      result.updateAttribute(50, 1);
    });
  });

  it('should return null when switch has no OnOff feature', () => {
    const device = makeDevice({
      category: 'motion_switch',
      features: [makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 })],
    });
    const result = createEndpointForDevice(device, ctx);
    assert.equal(result, null);
  });
});
