# Changelog

## 1.0.0 (2026-04-12)


### Features

* :sparkles: Use iotas v1 fire and forget for update ([#2](https://github.com/mezaugusto/matterbridge-iotas/issues/2)) ([f225ec6](https://github.com/mezaugusto/matterbridge-iotas/commit/f225ec66baa98f64e59e84e8afee9035aedb5aeb))

## 0.1.0

### Features

- Initial release
- IOTAS device discovery and Matter endpoint creation
- Support for lights (on/off and dimmable), outlets, door locks, thermostats, and sensors (humidity, motion, contact)
- Background polling with cached state via iotas-ts FeatureCache
- Write barrier to prevent UI rubber-banding after commands
- Allow/deny list filtering (whiteList/blackList) for device exposure
- Command handlers for on/off, level control, door lock, and thermostat setpoints
- Battery power source support for battery-powered devices
