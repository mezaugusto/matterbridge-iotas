import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { MatterbridgeDynamicPlatform, PlatformMatterbridge } from 'matterbridge';
import { AnsiLogger, LogLevel } from 'matterbridge/logger';
import { FeatureCache } from 'iotas-ts';

import { IotasPlatform } from '../src/module.js';
import type { IotasPluginConfig } from '../src/module.js';

function makeLog(): AnsiLogger {
  return new AnsiLogger({ logName: 'test', logLevel: LogLevel.NONE });
}

function makeMatterbridge(storageDir: string): PlatformMatterbridge {
  return { matterbridgeDirectory: storageDir, matterbridgeVersion: '3.7.0' } as unknown as PlatformMatterbridge;
}

function makeConfig(overrides: Partial<IotasPluginConfig> = {}): IotasPluginConfig {
  return {
    name: 'matterbridge-iotas',
    type: 'DynamicPlatform',
    debug: false,
    unregisterOnShutdown: false,
    username: 'test@example.com',
    password: 'secret',
    ...overrides,
  } as IotasPluginConfig;
}

describe('IotasPlatform', () => {
  let storageDir: string;

  before(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), 'mb-iotas-test-'));
  });

  after(async () => {
    await rm(storageDir, { recursive: true, force: true });
  });

  it('should create an IotasClient on construction', () => {
    const platform = new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig());
    assert.ok(platform.iotasClient);
    assert.ok(platform instanceof MatterbridgeDynamicPlatform);
  });

  it('should default pollingInterval to 5', () => {
    const platform = new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig());
    assert.equal(platform.pollingInterval, 5);
  });

  it('should use configured pollingInterval', () => {
    const platform = new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig({ pollingInterval: 30 }));
    assert.equal(platform.pollingInterval, 30);
  });

  it('should throw when username is missing', () => {
    assert.throws(() => new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig({ username: '' })), {
      message: 'IOTAS username and password are required',
    });
  });

  it('should throw when password is missing', () => {
    assert.throws(() => new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig({ password: '' })), {
      message: 'IOTAS username and password are required',
    });
  });

  it('should pass unit to client when configured', () => {
    const platform = new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig({ unit: 'Apt 101' }));
    assert.ok(platform.iotasClient);
  });

  it('should create a FeatureCache on construction', () => {
    const platform = new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig());
    assert.ok(platform.featureCache);
    assert.ok(platform.featureCache instanceof FeatureCache);
  });

  describe('createSnapshotFilter', () => {
    it('should return undefined when no lists configured', () => {
      const platform = new IotasPlatform(makeMatterbridge(storageDir), makeLog(), makeConfig());
      assert.equal(platform.createSnapshotFilter(), undefined);
    });

    it('should return undefined when lists are empty', () => {
      const platform = new IotasPlatform(
        makeMatterbridge(storageDir),
        makeLog(),
        makeConfig({ whiteList: [], blackList: [] } as unknown as Partial<IotasPluginConfig>),
      );
      assert.equal(platform.createSnapshotFilter(), undefined);
    });

    it('should return a filter function when whiteList is set', () => {
      const platform = new IotasPlatform(
        makeMatterbridge(storageDir),
        makeLog(),
        makeConfig({ whiteList: ['Living Room'] } as unknown as Partial<IotasPluginConfig>),
      );
      const filter = platform.createSnapshotFilter();
      assert.equal(typeof filter, 'function');
    });

    it('should return a filter function when blackList is set', () => {
      const platform = new IotasPlatform(
        makeMatterbridge(storageDir),
        makeLog(),
        makeConfig({ blackList: ['Bedroom'] } as unknown as Partial<IotasPluginConfig>),
      );
      const filter = platform.createSnapshotFilter();
      assert.equal(typeof filter, 'function');
    });
  });
});
