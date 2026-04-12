import { MatterbridgeDynamicPlatform, MatterbridgeEndpoint, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
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

  private deviceMap: Map<number, DeviceEntry> = new Map();

  constructor(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: IotasPluginConfig) {
    super(matterbridge, log, config);

    if (!config.username || !config.password) {
      throw new Error('IOTAS username and password are required');
    }

    this.pollingInterval = config.pollingInterval ?? 5;
    this.iotasClient = IotasClient.withCredentials(log, config.username, config.password, config.unit);
    this.featureCache = new FeatureCache(log, this.iotasClient, {
      pollIntervalMs: this.pollingInterval * 1000,
      // Increased to 15s as lock takes ~10s to acquire in worst case, and we want to avoid unnecessary retries
      writeBarrierMs: 15_000,
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

      this.log.info(`Discovered ${this.deviceMap.size} device(s)`);
    } catch (error) {
      this.log.error('Failed to start IOTAS platform:', error);
      throw error;
    }
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('Configuring IOTAS platform');

    try {
      const rooms = await this.iotasClient.getRooms();
      this.refreshStates(rooms);
    } catch (error) {
      this.log.warn('Failed to refresh device states on configure:', error);
    }
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
        const result = createEndpointForDevice(device, ctx);
        if (!result) {
          continue;
        }

        await this.registerDevice(result.endpoint);

        // Subscribe to feature changes via the cache
        const unsubscribe = this.featureCache.subscribe(result.featureIds.map(String), (changed) => {
          for (const [fid, value] of changed) {
            result.updateAttribute(Number(fid), value);
          }
        });

        this.deviceMap.set(device.id, {
          endpoint: result.endpoint,
          updateAttribute: result.updateAttribute,
          unsubscribe,
        });

        this.log.info(`Registered device: ${device.name} (${device.category})`);
      }
    }
  }

  private refreshStates(rooms: Rooms): void {
    for (const room of rooms) {
      for (const device of room.devices) {
        if (!device.paired) {
          continue;
        }

        const entry = this.deviceMap.get(device.id);
        if (!entry) {
          continue;
        }

        for (const feature of device.features) {
          if (feature.value !== undefined) {
            entry.updateAttribute(feature.id, feature.value);
          }
        }
      }
    }
  }
}
