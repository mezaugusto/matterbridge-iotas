# Changelog

## [1.1.6](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.1.5...v1.1.6) (2026-04-13)


### Bug Fixes

* :bug: Fix off setting in level lights ([#18](https://github.com/mezaugusto/matterbridge-iotas/issues/18)) ([09518e6](https://github.com/mezaugusto/matterbridge-iotas/commit/09518e65c229fda74dd0c9ad9544666d4784f54e))

## [1.1.5](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.1.4...v1.1.5) (2026-04-13)


### Bug Fixes

* :bug: Register both moveToLevel AND moveToLevelWithOnOff handlers for… ([#15](https://github.com/mezaugusto/matterbridge-iotas/issues/15)) ([bf9fc17](https://github.com/mezaugusto/matterbridge-iotas/commit/bf9fc177d466a623b195881e4b08e7ffee2fdcc9))
* Update iotas-ts ([#17](https://github.com/mezaugusto/matterbridge-iotas/issues/17)) ([a76d0e9](https://github.com/mezaugusto/matterbridge-iotas/commit/a76d0e9f8c2b4d0c2e7f8c82dbb0d52591fa9fe0))

## [1.1.4](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.1.3...v1.1.4) (2026-04-13)


### Bug Fixes

* :bug: Apply light value clamping through the app ([#13](https://github.com/mezaugusto/matterbridge-iotas/issues/13)) ([3fe8e60](https://github.com/mezaugusto/matterbridge-iotas/commit/3fe8e60e72959608f23e358e1c3d76d63313c047))

## [1.1.3](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.0.2...v1.1.3) (2026-04-12)

### Bug Fixes

- :bug: Fix dimmer lights not showing ([#10](https://github.com/mezaugusto/matterbridge-iotas/issues/10)) ([ea56bd7](https://github.com/mezaugusto/matterbridge-iotas/commit/ea56bd7641edd71d119779ad5d32bd66eeb8eb5b))

### Miscellaneous Chores

- release 1.1.3 ([#12](https://github.com/mezaugusto/matterbridge-iotas/issues/12)) Release-As: 1.1.3 ([6a15143](https://github.com/mezaugusto/matterbridge-iotas/commit/6a15143b05f92e5475dfa0e8ccf3b33c3a388dc1))

## [1.0.2](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.0.1...v1.0.2) (2026-04-12)

### Bug Fixes

- :bug: dimmable lights not showing ([#6](https://github.com/mezaugusto/matterbridge-iotas/issues/6)) ([d15f5a7](https://github.com/mezaugusto/matterbridge-iotas/commit/d15f5a7cf67fac017d75d9a623dc6c4c68423775))

## [1.0.2](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.0.1...v1.0.2) (2026-04-12)

### Bug Fixes

- :bug: dimmable lights not showing ([#6](https://github.com/mezaugusto/matterbridge-iotas/issues/6)) ([d15f5a7](https://github.com/mezaugusto/matterbridge-iotas/commit/d15f5a7cf67fac017d75d9a623dc6c4c68423775))

## [1.0.1](https://github.com/mezaugusto/matterbridge-iotas/compare/v1.0.0...v1.0.1) (2026-04-12)

### Bug Fixes

- :bug: fix deadlock on feature update ([#4](https://github.com/mezaugusto/matterbridge-iotas/issues/4)) ([e38bb09](https://github.com/mezaugusto/matterbridge-iotas/commit/e38bb09c92281fb3c1057eaeb397eeaf25f52590))

## 1.0.0 (2026-04-12)

### Features

- :sparkles: Use iotas v1 fire and forget for update ([#2](https://github.com/mezaugusto/matterbridge-iotas/issues/2)) ([f225ec6](https://github.com/mezaugusto/matterbridge-iotas/commit/f225ec66baa98f64e59e84e8afee9035aedb5aeb))

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
