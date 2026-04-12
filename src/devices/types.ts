/**
 * Shared types for device factories.
 */

import type { MatterbridgeEndpoint } from 'matterbridge';
import type { AnsiLogger } from 'matterbridge/logger';

export const VENDOR_ID = 0xfff1;

/**
 * Context for device creation, containing references to platform resources.
 */
export interface DeviceFactoryContext {
  log: AnsiLogger;
  debug: boolean;
  onFeatureUpdate: (featureId: number, value: number) => Promise<void>;
}

/**
 * Result of creating an endpoint.
 *
 * Self-contained: includes the endpoint, the feature IDs it tracks,
 * and a callback to push IOTAS value changes to Matter attributes.
 * All per-device-kind logic is co-located in the factory that builds this.
 */
export interface EndpointResult {
  endpoint: MatterbridgeEndpoint;
  featureIds: number[];
  updateAttribute: (featureId: number, value: number) => void;
}
