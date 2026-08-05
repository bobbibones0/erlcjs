import { describe, expect, it } from 'vitest';
import { Client } from '../client/client.js';
import { ERLCEvents } from '../client/events.js';

function makeServer() {
    const client = new Client({ servers: ['PRC-111111111-key'] });
    return client.servers.get('111111111')!;
}

function rawPlayer(name: string, id: number, team = 'Civilian'): any {
    return {
        Player: `${name}:${id}`,
        Permission: 'Normal',
        Team: team,
        Callsign: '',
        Location: { LocationX: 0, LocationZ: 0, PostalCode: '0', StreetName: '', BuildingNumber: '' },
        WantedStars: 0,
    };
}

describe('PlayerManager', () => {
    it('emits playerJoin for new players, playerUpdate for changes, and playerLeave for departures', () => {
        const server = makeServer();
        const client = server.client;
        const joins: number[] = [];
        const updates: string[] = [];
        const leaves: number[] = [];

        client.on(ERLCEvents.playerJoin, (p) => joins.push(p.id));
        client.on(ERLCEvents.playerUpdate, (_o, n) => updates.push(n.team));
        client.on(ERLCEvents.playerLeave, (p) => leaves.push(p.id));

        server.players.updateCache([rawPlayer('Alex', 1, 'Police')]);
        expect(joins).toEqual([1]);
        expect(server.players.cache.size).toBe(1);

        server.players.updateCache([rawPlayer('Alex', 1, 'Fire')]);
        expect(updates).toEqual(['Fire']);
        expect(server.players.cache.get(1)?.team).toBe('Fire');

        server.players.updateCache([rawPlayer('Other', 2)]);
        expect(leaves).toEqual([1]);
        expect(server.players.cache.size).toBe(1);
        expect(server.players.cache.get(2)?.username).toBe('Other');

        client.destroy();
    });

    it('resolves ids from names and clears caches', () => {
        const server = makeServer();
        server.players.updateCache([rawPlayer('Alex', 42)]);
        expect(server.players.getIdFromName('Alex')).toBe(42);
        expect(server.players.getIdFromName('nobody')).toBeUndefined();

        server.players.clear();
        expect(server.players.cache.size).toBe(0);
        expect(server.players.getIdFromName('Alex')).toBeUndefined();
        server.client.destroy();
    });
});
