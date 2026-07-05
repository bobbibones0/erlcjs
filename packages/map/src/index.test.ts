import { Client, ERLCEvents, PlayerPermission, Vehicles } from '@erlcjs/core';
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
    serverKey: process.env.API_KEY!,
    globalKey: process.env.GLOBAL_KEY,
    globalAppId: process.env.APP_ID,
});

client.on(ERLCEvents.playerJoin, async () => {
    const map = await drawMap({ players: client.players, emergencyCalls: client.emergencyCalls, map: MapType.fall, showModCalls: true });
    if (!map) return;
    await sharp(map).png().toFile('map.png');
})

client.on(ERLCEvents.playerUpdate, async () => {
    const map = await drawMap({ players: client.players, emergencyCalls: client.emergencyCalls, map: MapType.fall, showModCalls: true });
    if (!map) return;
    await sharp(map).png().toFile('map.png');
})