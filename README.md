# matterbridge-iotas

[![npm](https://img.shields.io/npm/v/matterbridge-iotas)](https://www.npmjs.com/package/matterbridge-iotas)

Matterbridge plugin for IOTAS smart home devices. Bridges IOTAS devices to the Matter protocol via [Matterbridge](https://github.com/Luligu/matterbridge), making them accessible from Apple Home, Google Home, Amazon Alexa, Home Assistant, and any Matter-compatible controller.

## Features

- Automatic device discovery by unit
- Supports lights, switches, outlets, locks, thermostats, and sensors
- Background polling with cached state
- Allow/deny list filtering for device exposure
- Uses [iotas-ts](https://github.com/mezaugusto/iotas-ts) shared library

## Supported Devices

| IOTAS Device    | Matter Device Type | Clusters                    |
| --------------- | ------------------ | --------------------------- |
| Dimmer          | Dimmable Light     | OnOff, LevelControl         |
| Switch (light)  | On/Off Light       | OnOff                       |
| Switch (outlet) | On/Off Outlet      | OnOff                       |
| Door Lock       | Door Lock          | DoorLock                    |
| Thermostat      | Thermostat         | Thermostat                  |
| Humidity Sensor | Humidity Sensor    | RelativeHumidityMeasurement |
| Motion Sensor   | Occupancy Sensor   | OccupancySensing            |
| Door Sensor     | Contact Sensor     | BooleanState                |

## Installation

### From npm

```bash
matterbridge -add matterbridge-iotas
```

### From GitHub (development)

```bash
cd ~/Matterbridge
git clone https://github.com/mezaugusto/matterbridge-iotas
cd matterbridge-iotas
npm install
npm link matterbridge
npm run build
matterbridge -add .
```

## Configuration

Configure via the Matterbridge web UI or edit `matterbridge-iotas.config.json`:

| Field             | Type     | Required | Default | Description                                    |
| ----------------- | -------- | -------- | ------- | ---------------------------------------------- |
| `username`        | string   | Yes      |         | IOTAS account email                            |
| `password`        | string   | Yes      |         | IOTAS account password                         |
| `unit`            | string   | No       |         | Unit name (defaults to first found)            |
| `whiteList`       | string[] | No       | `[]`    | Only expose these devices (empty = expose all) |
| `blackList`       | string[] | No       | `[]`    | Exclude these devices (empty = exclude none)   |
| `pollingInterval` | number   | No       | `5`     | Polling interval in seconds (5–300)            |
| `debug`           | boolean  | No       | `false` | Enable verbose debug logging                   |

## Development

```bash
npm install
npm link matterbridge
npm run build
npm run lint
npm test
```

## License

[Apache-2.0](LICENSE)
