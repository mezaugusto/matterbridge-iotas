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

  it('should return null when lock feature is missing', () => {
    assert.equal(createDoorLock(makeDevice({ features: [] }), ctx), null);
  });
});
