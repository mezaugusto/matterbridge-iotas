import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Thermostat } from 'matterbridge/matter/clusters';

import { createThermostat, iotasModeToSystemMode } from '../../src/devices/thermostat.js';
import { assertResult, makeCtx, makeDevice, makeFeature } from './helpers.js';

describe('thermostat', () => {
  const ctx = makeCtx();

  it('should create a thermostat with temperature', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 })],
    });
    const result = assertResult(createThermostat(device, ctx));
    assert.deepEqual(result.featureIds, [30]);
  });

  it('should include setpoints and mode when present', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [
        makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 }),
        makeFeature({ id: 31, featureTypeCategory: 'thermostat_mode', value: 1 }),
        makeFeature({ id: 32, featureTypeCategory: 'heat_set_point', value: 68 }),
        makeFeature({ id: 33, featureTypeCategory: 'cool_set_point', value: 76 }),
      ],
    });
    const result = assertResult(createThermostat(device, ctx));
    assert.deepEqual(result.featureIds, [30, 31, 32, 33]);
  });

  it('should return null when temperature feature is missing', () => {
    assert.equal(createThermostat(makeDevice({ features: [] }), ctx), null);
  });

  it('updateAttribute should not throw for tracked features', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [
        makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 }),
        makeFeature({ id: 31, featureTypeCategory: 'thermostat_mode', value: 1 }),
        makeFeature({ id: 32, featureTypeCategory: 'heat_set_point', value: 68 }),
        makeFeature({ id: 33, featureTypeCategory: 'cool_set_point', value: 76 }),
      ],
    });
    const result = assertResult(createThermostat(device, ctx));

    // Should not throw for any tracked feature
    assert.doesNotThrow(() => result.updateAttribute(30, 75));
    assert.doesNotThrow(() => result.updateAttribute(31, 2));
    assert.doesNotThrow(() => result.updateAttribute(32, 70));
    assert.doesNotThrow(() => result.updateAttribute(33, 78));
    // Untracked feature should be a no-op
    assert.doesNotThrow(() => result.updateAttribute(999, 0));
  });
});

describe('iotasModeToSystemMode', () => {
  it('should map IOTAS modes to Matter SystemMode', () => {
    assert.equal(iotasModeToSystemMode(0), Thermostat.SystemMode.Off);
    assert.equal(iotasModeToSystemMode(1), Thermostat.SystemMode.Heat);
    assert.equal(iotasModeToSystemMode(2), Thermostat.SystemMode.Cool);
    assert.equal(iotasModeToSystemMode(3), Thermostat.SystemMode.EmergencyHeat);
    assert.equal(iotasModeToSystemMode(4), Thermostat.SystemMode.Auto);
    assert.equal(iotasModeToSystemMode(99), Thermostat.SystemMode.Off);
  });
});
