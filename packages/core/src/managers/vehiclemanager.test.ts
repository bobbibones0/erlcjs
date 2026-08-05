import { describe, expect, it } from 'vitest';
import { Client } from '../client/client.js';
import { ERLCEvents } from '../client/events.js';

function makeServer() {
    const client = new Client({ servers: ['PRC-111111111-key'] });
    return client.servers.get('111111111')!;
}

function rawPlayer(name: string, id: number): any {
    return {
        Player: `${name}:${id}`,
        Permission: 'Normal',
        Team: 'Civilian',
        Callsign: '',
        Location: { LocationX: 0, LocationZ: 0, PostalCode: '0', StreetName: '', BuildingNumber: '' },
        WantedStars: 0,
    };
}

describe('VehicleManager', () => {
    it('emits vehicleAdd for spawned vehicles and resolves the owner from the player cache', () => {
        const server = makeServer();
        const client = server.client;
        server.players.updateCache([rawPlayer('Alex', 7)]);

        const added: string[] = [];
        client.on(ERLCEvents.vehicleAdd, (v) => added.push(v.plate));

        server.vehicles.updateCache([
            { Name: 'Chevlon Captain 1992', Owner: 'Alex', Plate: 'ABC123', ColorHex: '#fff', ColorName: 'White' },
        ]);

        const vehicle = server.vehicles.cache.get('ABC123');
        expect(added).toEqual(['ABC123']);
        expect(vehicle?.ownerId).toBe(7);
        expect(vehicle?.owner.username).toBe('Alex');
        expect(vehicle?.server).toBe(server);

        client.destroy();
    });
});
