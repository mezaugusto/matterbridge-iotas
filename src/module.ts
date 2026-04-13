import { MatterbridgeDynamicPlatform, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import type { MatterbridgeEndpoint } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { FeatureCache, IotasClient, filterDevices } from 'iotas-ts';
import type { Rooms, SnapshotFilter } from 'iotas-ts';

import { createEndpointForDevice } from './deviceFactory.js';
import type { DeviceFactoryContext } from './devices/types.js';

export interface IotasPluginConfig extends PlatformConfig {
  username: string;
  password: string;
  unit?: string;
  pollingInterval?: number;
}

export default function initializePlugin(
  matterbridge: PlatformMatterbridge,
  log: AnsiLogger,
  config: PlatformConfig,
): IotasPlatform {
  return new IotasPlatform(matterbridge, log, config as IotasPluginConfig);
}

interface DeviceEntry {
  endpoint: MatterbridgeEndpoint;
  updateAttribute: (featureId: number, value: number) => void;
  unsubscribe: () => void;
}

export class IotasPlatform extends MatterbridgeDynamicPlatform {
  iotasClient: IotasClient;
  featureCache: FeatureCache;
  pollingInterval: number;

  private deviceEntries: DeviceEntry[] = [];

  constructor(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: IotasPluginConfig) {
    super(matterbridge, log, config);

    if (!config.username || !config.password) {
      throw new Error('IOTAS username and password are required');
    }

    this.pollingInterval = config.pollingInterval ?? 5;
    this.iotasClient = IotasClient.withCredentials(log, config.username, config.password, config.unit);
    this.featureCache = new FeatureCache(log, this.iotasClient, {
      pollIntervalMs: this.pollingInterval * 1000,
      snapshotFilter: this.createSnapshotFilter(),
    });

    this.log.info('IOTAS platform initialized');
  }

  createSnapshotFilter(): SnapshotFilter | undefined {
    const whiteList = this.config.whiteList as string[] | undefined;
    const blackList = this.config.blackList as string[] | undefined;

    if ((!whiteList || whiteList.length === 0) && (!blackList || blackList.length === 0)) {
      return undefined;
    }

    return (rooms) =>
      filterDevices(rooms, {
        allowList: whiteList,
        denyList: blackList,
      });
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info(`Starting IOTAS platform${reason ? ': ' + reason : ''}`);

    try {
      await this.iotasClient.initialize();

      const rooms = await this.iotasClient.getRooms();
      this.featureCache.seed(rooms);
      await this.discoverDevices(rooms);
      this.featureCache.start();

      this.log.info(`Discovered ${this.deviceEntries.length} endpoint(s)`);
    } catch (error) {
      this.log.error('Failed to start IOTAS platform:', error);
      throw error;
    }
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('Configuring IOTAS platform');
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);
    this.log.info(`Shutting down IOTAS platform${reason ? ': ' + reason : ''}`);

    this.featureCache.stop();

    if (this.config.unregisterOnShutdown === true) {
      await this.unregisterAllDevices();
    }
  }

  private async discoverDevices(rooms: Rooms): Promise<void> {
    const ctx: DeviceFactoryContext = {
      log: this.log,
      debug: this.config.debug ?? false,
      onFeatureUpdate: (featureId: number, value: number) => {
        this.featureCache.writeThrough(featureId.toString(), value);
      },
    };

    for (const room of rooms) {
      for (const device of room.devices) {
        const results = createEndpointForDevice(device, ctx);

        for (const result of results) {
          await this.registerDevice(result.endpoint);

          const unsubscribe = this.featureCache.subscribe(result.featureIds.map(String), (changed) => {
            for (const [fid, value] of changed) {
              result.updateAttribute(Number(fid), value);
            }
          });

          this.deviceEntries.push({
            endpoint: result.endpoint,
            updateAttribute: result.updateAttribute,
            unsubscribe,
          });

          this.log.info(`Registered endpoint: ${result.endpoint.id} (${device.name})`);
        }
      }
    }
  }
}
