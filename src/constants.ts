/**
 * Constants for IOTAS device categories, event types, and feature categories.
 * Provides both runtime values and compile-time safety.
 */

/** IOTAS device categories that map to Matter device types. */
export const DeviceCategory = {
  Dimmer: 'dimmer',
  Switch: 'switch',
  MotionSwitch: 'motion_switch',
  Lock: 'lock',
  Thermostat: 'thermostat',
  Door: 'door',
} as const;
export type DeviceCategory = (typeof DeviceCategory)[keyof typeof DeviceCategory];

const deviceCategoryValues = new Set<string>(Object.values(DeviceCategory));

/** Runtime type guard for validating device categories from external payloads. */
export function isDeviceCategory(value: string): value is DeviceCategory {
  return deviceCategoryValues.has(value);
}

/** IOTAS event type names used to locate features by their event type. */
export const EventType = {
  OnOff: 'OnOff',
  Level: 'Level',
} as const;
export type EventTypeName = (typeof EventType)[keyof typeof EventType];

/** IOTAS feature type categories used to locate features by their category. */
export const FeatureType = {
  Lock: 'lock',
  Battery: 'battery',
  CurrentTemperature: 'current_temperature',
  ThermostatMode: 'thermostat_mode',
  HeatSetPoint: 'heat_set_point',
  CoolSetPoint: 'cool_set_point',
  Humidity: 'humidity',
  Motion: 'motion',
  DoorState: 'door_state',
} as const;
export type FeatureCategory = (typeof FeatureType)[keyof typeof FeatureType];
