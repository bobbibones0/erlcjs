import { Client, ERLCEvents } from '@erlcjs/core';
import { drawMap } from './canvas';
import { MapType } from './enums';
import sharp from 'sharp';

const client = new Client({
    polling: {
        enabled: true,
    },
    webhook: {
        enabled: true,
        port: 3000,
    },
    servers: [process.env.API_KEY!],
    globalKey: process.env.GLOBAL_KEY,
    globalAppId: process.env.APP_ID,
});

const server = Array.from(client.servers.values())[0]!;

client.on(ERLCEvents.playerJoin, async () => {
    const map = await drawMap({ players: server.players, emergencyCalls: server.emergencyCalls, map: MapType.fall, showModCalls: true });
    if (!map) return;
    await sharp(map).png().toFile('map.png');
})

client.on(ERLCEvents.playerUpdate, async () => {
    const map = await drawMap({ players: server.players, emergencyCalls: server.emergencyCalls, map: MapType.fall, showModCalls: true });
    if (!map) return;
    await sharp(map).png().toFile('map.png');
})