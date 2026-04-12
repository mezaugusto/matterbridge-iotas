import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createDimmableLight, createOnOffLight } from '../../src/devices/lights.js';
import { assertResult, makeCtx, makeDevice, makeFeature } from './helpers.js';

describe('lights', () => {
  const ctx = makeCtx();

  describe('createDimmableLight', () => {
    it('should create a dimmable light with OnOff and Level features', () => {
      const device = makeDevice({
        name: 'Dimmer',
        category: 'dimmer',
        features: [
          makeFeature({ id: 10, eventTypeName: 'OnOff', value: 1 }),
          makeFeature({ id: 11, eventTypeName: 'Level', value: 0.5 }),
        ],
      });
      const result = assertResult(createDimmableLight(device, ctx));
      assert.deepEqual(result.featureIds, [10, 11]);
    });

    it('should create a level-only dimmable light when OnOff feature is missing', () => {
      const device = makeDevice({
        name: 'Hall lights',
        category: 'dimmer',
        features: [makeFeature({ id: 11, eventTypeName: 'Level', value: 0.5 })],
      });
      const result = assertResult(createDimmableLight(device, ctx));
      assert.deepEqual(result.featureIds, [11]);
    });

    it('should return null when Level feature is missing', () => {
      const device = makeDevice({
        features: [makeFeature({ id: 10, eventTypeName: 'OnOff', value: 1 })],
      });
      assert.equal(createDimmableLight(device, ctx), null);
    });
  });

  describe('createOnOffLight', () => {
    it('should create an on/off light', () => {
      const device = makeDevice({
        features: [makeFeature({ id: 10, eventTypeName: 'OnOff', isLight: true, value: 0 })],
      });
      const result = assertResult(createOnOffLight(device, ctx));
      assert.deepEqual(result.featureIds, [10]);
    });

    it('should return null when OnOff feature is missing', () => {
      assert.equal(createOnOffLight(makeDevice({ features: [] }), ctx), null);
    });
  });
});
