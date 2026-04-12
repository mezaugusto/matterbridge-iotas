/**
 * Shared test helpers for device factory tests.
 */

import assert from 'node:assert/strict';

import { AnsiLogger, LogLevel } from 'matterbridge/logger';
import type { Device, Feature } from 'iotas-ts';

import type { DeviceFactoryContext, EndpointResult } from '../../src/devices/types.js';

export function makeLog(): AnsiLogger {
  return new AnsiLogger({ logName: 'test', logLevel: LogLevel.NONE });
}

/**
 * Suppress console output while running a function.
 * Matterbridge logs warnings when calling setAttribute on inactive endpoints
 * (expected in unit tests where endpoints aren't registered).
 */
export function suppressLogs(fn: () => void): void {
  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    fn();
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

/** Assert result is non-null and return it. */
export function assertResult(result: EndpointResult | null): EndpointResult {
  assert.ok(result, 'Expected non-null result');
  assert.ok(Array.isArray(result.featureIds), 'Expected featureIds array');
  assert.equal(typeof result.updateAttribute, 'function', 'Expected updateAttribute function');
  return result;
}

export function makeCtx(overrides: Partial<DeviceFactoryContext> = {}): DeviceFactoryContext {
  return {
    log: makeLog(),
    debug: false,
    onFeatureUpdate: async () => {},
    ...overrides,
  };
}

export function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 1,
    device: 1,
    featureType: 1,
    featureTypeName: 'Test',
    featureTypeCategory: 'test',
    name: 'Test Feature',
    isLight: false,
    ...overrides,
  };
}

export function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 1,
    room: 1,
    deviceTemplateId: 1,
    deviceType: 1,
    name: 'Test Device',
    category: 'switch',
    active: true,
    movable: false,
    secure: false,
    paired: true,
    features: [],
    ...overrides,
  };
}
