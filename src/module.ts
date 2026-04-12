/**
 * Matterbridge IOTAS Plugin
 *
 * Entry point for the Matterbridge dynamic platform plugin.
 * Bridges IOTAS smart home devices to Matter via Matterbridge.
 */

import { MatterbridgeDynamicPlatform, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { IotasClient, filterDevices } from 'iotas-ts';
import type { SnapshotFilter } from 'iotas-ts';

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

export class IotasPlatform extends MatterbridgeDynamicPlatform {
  iotasClient: IotasClient;
  pollingInterval: number;

  constructor(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: IotasPluginConfig) {
    super(matterbridge, log, config);

    if (!config.username || !config.password) {
      throw new Error('IOTAS username and password are required');
    }

    this.iotasClient = IotasClient.withCredentials(log, config.username, config.password, config.unit);
    this.pollingInterval = config.pollingInterval ?? 5;
    this.log.info('IOTAS client initialized');
  }

  /**
   * Build a SnapshotFilter from the Matterbridge whiteList/blackList config.
   * Returns undefined if neither list is configured.
   */
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
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('Configuring IOTAS platform');
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);
    this.log.info(`Shutting down IOTAS platform${reason ? ': ' + reason : ''}`);
    if (this.config.unregisterOnShutdown === true) {
      await this.unregisterAllDevices();
    }
  }
}
