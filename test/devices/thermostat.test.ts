import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FanControl, Thermostat } from 'matterbridge/matter/clusters';

import { createThermostat, iotasModeToSystemMode, iotasFanModeToMatter } from '../../src/devices/thermostat.js';
import { assertResults, makeCtx, makeDevice, makeFeature, suppressLogs } from './helpers.js';

describe('thermostat', () => {
  const ctx = makeCtx();

  it('should create a thermostat with temperature', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 })],
    });
    const results = assertResults(createThermostat(device, ctx), 1);
    assert.deepEqual(results[0].featureIds, [30]);
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
    const results = assertResults(createThermostat(device, ctx), 1);
    assert.deepEqual(results[0].featureIds, [30, 31, 32, 33]);
  });

  it('should include humidity as child on thermostat endpoint', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [
        makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 }),
        makeFeature({ id: 34, featureTypeCategory: 'humidity', value: 45 }),
      ],
    });
    const results = assertResults(createThermostat(device, ctx), 1);
    assert.deepEqual(results[0].featureIds, [30, 34]);
  });

  it('should create fan as separate endpoint', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [
        makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 }),
        makeFeature({ id: 35, featureTypeCategory: 'fan_mode', eventTypeName: 'FanMode', value: 0 }),
      ],
    });
    const results = assertResults(createThermostat(device, ctx), 2);
    assert.deepEqual(results[0].featureIds, [30]);
    assert.deepEqual(results[1].featureIds, [35]);
  });

  it('should return all features split across thermostat and fan endpoints', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [
        makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 }),
        makeFeature({ id: 31, featureTypeCategory: 'thermostat_mode', value: 1 }),
        makeFeature({ id: 32, featureTypeCategory: 'heat_set_point', value: 68 }),
        makeFeature({ id: 33, featureTypeCategory: 'cool_set_point', value: 76 }),
        makeFeature({ id: 34, featureTypeCategory: 'humidity', value: 45 }),
        makeFeature({ id: 35, featureTypeCategory: 'fan_mode', eventTypeName: 'FanMode', value: 0 }),
      ],
    });
    const results = assertResults(createThermostat(device, ctx), 2);
    assert.deepEqual(results[0].featureIds, [30, 31, 32, 33, 34]);
    assert.deepEqual(results[1].featureIds, [35]);
  });

  it('should return empty array when temperature feature is missing', () => {
    const results = createThermostat(makeDevice({ features: [] }), ctx);
    assert.deepEqual(results, []);
  });

  it('updateAttribute should not throw for tracked features', () => {
    const device = makeDevice({
      category: 'thermostat',
      features: [
        makeFeature({ id: 30, featureTypeCategory: 'current_temperature', value: 72 }),
        makeFeature({ id: 31, featureTypeCategory: 'thermostat_mode', value: 1 }),
        makeFeature({ id: 32, featureTypeCategory: 'heat_set_point', value: 68 }),
        makeFeature({ id: 33, featureTypeCategory: 'cool_set_point', value: 76 }),
        makeFeature({ id: 34, featureTypeCategory: 'humidity', value: 45 }),
        makeFeature({ id: 35, featureTypeCategory: 'fan_mode', eventTypeName: 'FanMode', value: 0 }),
      ],
    });
    const results = assertResults(createThermostat(device, ctx), 2);

    suppressLogs(() => {
      assert.doesNotThrow(() => results[0].updateAttribute(30, 75));
      assert.doesNotThrow(() => results[0].updateAttribute(31, 2));
      assert.doesNotThrow(() => results[0].updateAttribute(32, 70));
      assert.doesNotThrow(() => results[0].updateAttribute(33, 78));
      assert.doesNotThrow(() => results[0].updateAttribute(34, 50));
      assert.doesNotThrow(() => results[0].updateAttribute(999, 0));
      assert.doesNotThrow(() => results[1].updateAttribute(35, 1));
      assert.doesNotThrow(() => results[1].updateAttribute(999, 0));
    });
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

describe('iotasFanModeToMatter', () => {
  it('should map IOTAS fan modes to Matter FanMode', () => {
    assert.equal(iotasFanModeToMatter(0), FanControl.FanMode.Auto); // Auto Low → Auto
    assert.equal(iotasFanModeToMatter(1), FanControl.FanMode.Low); // On Low → Low
    assert.equal(iotasFanModeToMatter(2), FanControl.FanMode.On); // Circulate → On
  });

  it('should default to Auto for unknown modes', () => {
    assert.equal(iotasFanModeToMatter(99), FanControl.FanMode.Auto);
    assert.equal(iotasFanModeToMatter(-1), FanControl.FanMode.Auto);
  });
});
