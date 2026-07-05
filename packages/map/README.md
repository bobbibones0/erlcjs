# @erlcjs/map

[![npm version](https://img.shields.io/npm/v/@erlcjs/map?style=flat-square)](https://www.npmjs.com/package/@erlcjs/map)
[![npm downloads](https://img.shields.io/npm/dm/@erlcjs/map?style=flat-square)](https://www.npmjs.com/package/@erlcjs/map)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/@erlcjs/presets?style=flat-square)](https://github.com/erlc-js/erlcjs/blob/main/LICENSE)

`@erlcjs/map` allows for simple creation of a rendered in-game map with player locations, emergency call locations and mod calls.

## Features

*   **Customizable**: Easily customize which features are shown on the map.
*   **Lightning Fast**: Uses sharp under the hood to ensure the fastest possible image generation.
*   **Custom Map**: Don't want to use a public ER:LC map? Just add your own.
*   **TypeScript Native**: Fully typed for a great developer experience.

## Prerequisites

- Node.js V16.0.0 or higher or Bun V1.0.0 or higher.
- `@erlcjs/core` installed and configured.

## Installation

Install `@erlcjs/map` in your project:

```bash
npm install @erlcjs/map
# or
pnpm add @erlcjs/map
# or
yarn add @erlcjs/map
```

## Quick Start

### Generate a Map

Generates a map every poll in the file 'map.png'.

```typescript
import { Client, ERLCEvents, Vehicles } from '@erlcjs/core';
import { drawMap, MapType } from '@erlcjs/presets';

const client = new Client({ /* ... */ });

client.on(
  ERLCEvents.poll,
  () => {
    const map = await drawMap({ players: client.players, emergencyCalls: client.emergencyCalls, map: MapType.fall, showModCalls: true });
    if (!map) return;
    await sharp(map).png().toFile('map.png');
  }
);
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](../../LICENSE) file for details.