import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createDoorLock } from '../../src/devices/lock.js';
import { assertResult, makeCtx, makeDevice, makeFeature, suppressLogs } from './helpers.js';

describe('lock', () => {
  const ctx = makeCtx();

  it('should create a door lock', () => {
    const device = makeDevice({
      category: 'lock',
      features: [makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 })],
    });
    const result = assertResult(createDoorLock(device, ctx));
    assert.deepEqual(result.featureIds, [20]);
  });

  it('should include battery when present', () => {
    const device = makeDevice({
      category: 'lock',
      features: [
        makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 }),
        makeFeature({ id: 21, featureTypeCategory: 'battery', value: 0.85 }),
      ],
    });
    const result = assertResult(createDoorLock(device, ctx));
    assert.deepEqual(result.featureIds, [20, 21]);
  });

  it('should include auto_relock features when both present', () => {
    const device = makeDevice({
      category: 'lock',
      features: [
        makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 }),
        makeFeature({ id: 22, featureTypeCategory: 'auto_relock', value: 1, featureTypeSettable: true }),
        makeFeature({ id: 23, featureTypeCategory: 'auto_relock_timeout', value: 30, featureTypeSettable: true }),
      ],
    });
    const result = assertResult(createDoorLock(device, ctx));
    assert.deepEqual(result.featureIds, [20, 22, 23]);
  });

  it('should include all features together', () => {
    const device = makeDevice({
      category: 'lock',
      features: [
        makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 }),
        makeFeature({ id: 21, featureTypeCategory: 'battery', value: 33 }),
        makeFeature({ id: 22, featureTypeCategory: 'auto_relock', value: 0, featureTypeSettable: true }),
        makeFeature({ id: 23, featureTypeCategory: 'auto_relock_timeout', value: 30, featureTypeSettable: true }),
      ],
    });
    const result = assertResult(createDoorLock(device, ctx));
    assert.deepEqual(result.featureIds, [20, 21, 22, 23]);
  });

  it('updateAttribute should not throw for lock and battery features', () => {
    const device = makeDevice({
      category: 'lock',
      features: [
        makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 }),
        makeFeature({ id: 21, featureTypeCategory: 'battery', value: 0.85 }),
      ],
    });
    const result = assertResult(createDoorLock(device, ctx));

    assert.doesNotThrow(() => suppressLogs(() => result.updateAttribute(20, 0)));
    assert.doesNotThrow(() => suppressLogs(() => result.updateAttribute(21, 0.5)));
    assert.doesNotThrow(() => suppressLogs(() => result.updateAttribute(999, 0)));
  });

  it('updateAttribute should not throw for auto_relock features', () => {
    const device = makeDevice({
      category: 'lock',
      features: [
        makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 }),
        makeFeature({ id: 22, featureTypeCategory: 'auto_relock', value: 0, featureTypeSettable: true }),
        makeFeature({ id: 23, featureTypeCategory: 'auto_relock_timeout', value: 30, featureTypeSettable: true }),
      ],
    });
    const result = assertResult(createDoorLock(device, ctx));

    suppressLogs(() => {
      assert.doesNotThrow(() => result.updateAttribute(22, 1)); // enable auto-relock
      assert.doesNotThrow(() => result.updateAttribute(23, 60)); // change timeout
      assert.doesNotThrow(() => result.updateAttribute(22, 0)); // disable auto-relock
    });
  });

  it('should include door_lock_state features with defined values', () => {
    const device = makeDevice({
      category: 'lock',
      features: [
        makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 }),
        makeFeature({ id: 24, featureTypeCategory: 'door_lock_state', value: undefined }),
        makeFeature({ id: 25, featureTypeCategory: 'door_lock_state', value: 22 }),
      ],
    });
    const result = assertResult(createDoorLock(device, ctx));
    // Only the feature with a defined value (id 25) should be tracked
    assert.ok(result.featureIds.includes(25));
    assert.ok(!result.featureIds.includes(24));
  });

  it('updateAttribute should not throw for door_lock_state', () => {
    const device = makeDevice({
      category: 'lock',
      features: [
        makeFeature({ id: 20, featureTypeCategory: 'lock', value: 1 }),
        makeFeature({ id: 25, featureTypeCategory: 'door_lock_state', value: 22 }),
      ],
    });
    const result = assertResult(createDoorLock(device, ctx));

    suppressLogs(() => {
      assert.doesNotThrow(() => result.updateAttribute(25, 21)); // ManualLock
      assert.doesNotThrow(() => result.updateAttribute(25, 22)); // ManualUnlock
      assert.doesNotThrow(() => result.updateAttribute(25, 9)); // Jammed (unknown → no-op)
    });
  });

  it('should return null when lock feature is missing', () => {
    assert.equal(createDoorLock(makeDevice({ features: [] }), ctx), null);
  });
});
