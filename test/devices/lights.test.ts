import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createDimmableLight, createOnOffLight } from '../../src/devices/lights.js';
import { assertResult, makeCtx, makeDevice, makeFeature, suppressLogs } from './helpers.js';

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

    it('should clamp initial level to minimum 1 when device level is 0', () => {
      const device = makeDevice({
        name: 'Off Dimmer',
        category: 'dimmer',
        features: [makeFeature({ id: 11, eventTypeName: 'Level', value: 0 })],
      });
      // Should not throw — level=0 is clamped to 1 internally
      const result = assertResult(createDimmableLight(device, ctx));
      assert.deepEqual(result.featureIds, [11]);
    });

    it('should handle off command sending IOTAS level 0 in level-only mode', () => {
      const updates: Array<{ featureId: number; value: number }> = [];
      const testCtx = makeCtx({
        onFeatureUpdate: (featureId, value) => {
          updates.push({ featureId, value });
        },
      });
      const device = makeDevice({
        name: 'Level Dimmer',
        category: 'dimmer',
        features: [makeFeature({ id: 11, eventTypeName: 'Level', value: 0.5 })],
      });
      const result = assertResult(createDimmableLight(device, testCtx));

      // Trigger off via the poll update callback (simulates IOTAS returning level=0)
      // This exercises the clampLevel path — should not throw on the constraint
      suppressLogs(() => result.updateAttribute(11, 0));
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
