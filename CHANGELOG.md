# Changelog

## [1.0.2](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.0.1...v1.0.2) (2026-04-12)


### Bug Fixes

* :bug: dimmable lights not showing ([#6](https://github.com/mezaugusto/matterbridge-iotas/issues/6)) ([d15f5a7](https://github.com/mezaugusto/matterbridge-iotas/commit/d15f5a7cf67fac017d75d9a623dc6c4c68423775))

## [1.0.2](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.0.1...v1.0.2) (2026-04-12)


### Bug Fixes

* :bug: dimmable lights not showing ([#6](https://github.com/mezaugusto/matterbridge-iotas/issues/6)) ([d15f5a7](https://github.com/mezaugusto/matterbridge-iotas/commit/d15f5a7cf67fac017d75d9a623dc6c4c68423775))

## [1.0.1](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.0.0...v1.0.1) (2026-04-12)


### Bug Fixes

* :bug: fix deadlock on feature update ([#4](https://github.com/mezaugusto/matterbridge-iotas/issues/4)) ([e38bb09](https://github.com/mezaugusto/matterbridge-iotas/commit/e38bb09c92281fb3c1057eaeb397eeaf25f52590))

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
