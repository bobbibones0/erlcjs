# @erlcjs/presets

[![npm version](https://img.shields.io/npm/v/@erlcjs/presets?style=flat-square)](https://www.npmjs.com/package/@erlcjs/presets)
[![npm downloads](https://img.shields.io/npm/dm/@erlcjs/presets?style=flat-square)](https://www.npmjs.com/package/@erlcjs/presets)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/@erlcjs/presets?style=flat-square)](https://github.com/erlc-js/erlcjs/blob/main/LICENSE)

`@erlcjs/presets` provides a collection of pre-built moderation, punishment, and utility presets for use with `@erlcjs/core`. These presets streamline common server management tasks like vehicle banning, livery restrictions, and player command automation.

## Features

*   **Vehicle Banning**: Easily restrict specific vehicles with customizable punishment actions.
*   **Livery Restrictions**: Control which liveries are allowed on your server.
*   **Punishment Actions**: Pre-configured warn-then-kick, and other moderation workflows.
*   **Player Commands**: Built-in presets for common player management commands.
*   **TypeScript Native**: Fully typed for a great developer experience.

## Prerequisites

- Node.js V16.0.0 or higher or Bun V1.0.0 or higher.
- `@erlcjs/core` installed and configured.

## Installation

Install `@erlcjs/presets` in your project:

```bash
npm install @erlcjs/presets
# or
pnpm add @erlcjs/presets
# or
yarn add @erlcjs/presets
```

## Quick Start

### Vehicle Banning

Prevent players from using specific vehicles with automatic punishment:

```typescript
import { Client, ERLCEvents, Vehicles } from '@erlcjs/core';
import { banVehicles, VehiclePunishments } from '@erlcjs/presets';

const client = new Client({ /* ... */ });

// Ban the Bugatti Veyron for normal players
client.on(
  ERLCEvents.vehicleAdd,
  banVehicles(
    [Vehicles.BUGATTI_VEYRON],
    VehiclePunishments.warnThenKick(10, true, 'This vehicle is restricted.'),
    [PlayerPermission.Mod, PlayerPermission.Administrator] // Allowlist
  )
);
```

### Livery Restrictions

Restrict specific liveries with customizable punishments:

```typescript
import { Client, ERLCEvents, PlayerPermission } from '@erlcjs/core';
import { banLiveries, LiveryPunishments } from '@erlcjs/presets';

const client = new Client({ /* ... */ });

// Ban the 'Staff' livery except for staff members
client.on(
  ERLCEvents.vehicleAdd,
  banLiveries(
    ['Staff'],
    LiveryPunishments.warnThenKick(15, true, 'This livery is restricted.'),
    [PlayerPermission.Mod, PlayerPermission.Administrator, PlayerPermission.Owner]
  )
);
```

## Available Presets

### Vehicle Management

- **`banVehicles()`**: Ban specific vehicles with optional player allowlist
- **`VehiclePunishments.warnThenKick()`**: Warn then kick players using banned vehicles

### Livery Management

- **`banLiveries()`**: Ban specific liveries with optional player allowlist
- **`LiveryPunishments.warnThenKick()`**: Warn then kick players using banned liveries

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](../../LICENSE) file for details.