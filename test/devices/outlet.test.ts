import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createOnOffOutlet } from '../../src/devices/outlet.js';
import { assertResult, makeCtx, makeDevice, makeFeature } from './helpers.js';

describe('outlet', () => {
  const ctx = makeCtx();

  it('should create an on/off outlet', () => {
    const device = makeDevice({
      features: [makeFeature({ id: 10, eventTypeName: 'OnOff', value: 1 })],
    });
    const result = assertResult(createOnOffOutlet(device, ctx));
    assert.deepEqual(result.featureIds, [10]);
  });

  it('should return null when OnOff feature is missing', () => {
    assert.equal(createOnOffOutlet(makeDevice({ features: [] }), ctx), null);
  });
});
