# matterbridge-iotas

Matterbridge plugin for IOTAS smart home devices. Bridges IOTAS devices to the Matter protocol via [Matterbridge](https://github.com/Luligu/matterbridge).

## Features

- Supports lights, switches, locks, thermostats, and sensors
- Background polling with cached state
- Write barrier to prevent UI rubber-banding
- Uses [iotas-ts](https://github.com/mezaugusto/iotas-ts) shared library

## Installation

```bash
npm install -g matterbridge-iotas
```

Then add it as a plugin in the Matterbridge web UI.

## Configuration

| Field             | Required | Default | Description                         |
| ----------------- | -------- | ------- | ----------------------------------- |
| `username`        | Yes      |         | IOTAS account email                 |
| `password`        | Yes      |         | IOTAS account password              |
| `unit`            | No       |         | Unit name (defaults to first found) |
| `pollingInterval` | No       | 5       | Polling interval in seconds (5–300) |
| `debug`           | No       | false   | Enable verbose debug logging        |

## Development

```bash
npm install
npm link matterbridge
npm run build
npm run lint
npm test
```
