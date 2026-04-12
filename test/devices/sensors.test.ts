import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createHumiditySensor, createOccupancySensor, createContactSensor } from '../../src/devices/sensors.js';
import { assertResult, makeCtx, makeDevice, makeFeature } from './helpers.js';

describe('sensors', () => {
  const ctx = makeCtx();

  describe('createHumiditySensor', () => {
    it('should create a humidity sensor', () => {
      const device = makeDevice({
        features: [makeFeature({ id: 40, featureTypeCategory: 'humidity', value: 0.65 })],
      });
      const result = assertResult(createHumiditySensor(device, ctx));
      assert.deepEqual(result.featureIds, [40]);
    });

    it('should return null when humidity feature is missing', () => {
      assert.equal(createHumiditySensor(makeDevice({ features: [] }), ctx), null);
    });
  });

  describe('createOccupancySensor', () => {
    it('should create an occupancy sensor', () => {
      const device = makeDevice({
        features: [makeFeature({ id: 50, featureTypeCategory: 'motion', value: 0 })],
      });
      const result = assertResult(createOccupancySensor(device, ctx));
      assert.deepEqual(result.featureIds, [50]);
    });

    it('should return null when motion feature is missing', () => {
      assert.equal(createOccupancySensor(makeDevice({ features: [] }), ctx), null);
    });
  });

  describe('createContactSensor', () => {
    it('should create a contact sensor', () => {
      const device = makeDevice({
        features: [makeFeature({ id: 60, featureTypeCategory: 'door_state', value: 1 })],
      });
      const result = assertResult(createContactSensor(device, ctx));
      assert.deepEqual(result.featureIds, [60]);
    });

    it('should return null when door_state feature is missing', () => {
      assert.equal(createContactSensor(makeDevice({ features: [] }), ctx), null);
    });
  });
});
