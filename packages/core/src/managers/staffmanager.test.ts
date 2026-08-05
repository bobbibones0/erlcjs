import { describe, expect, it } from 'vitest';
import { Client } from '../client/client.js';
import { ERLCEvents } from '../client/events.js';

function makeServer() {
    const client = new Client({ servers: ['PRC-111111111-key'] });
    return client.servers.get('111111111')!;
}

describe('StaffManager', () => {
    it('emits staffAdd and staffRemove, keeping staff grouped by role', () => {
        const server = makeServer();
        const client = server.client;
        const added: Array<[string, string]> = [];
        const removed: Array<[string, string]> = [];

        client.on(ERLCEvents.staffAdd, (staff, type) => added.push([staff.username, type]));
        client.on(ERLCEvents.staffRemove, (staff, type) => removed.push([staff.username, type]));

        server.staff.updateCache({ Admins: { '1': 'Alex' }, Mods: {}, Helpers: {} });
        expect(added).toEqual([['Alex', 'Admin']]);
        expect(server.staff.admins.size).toBe(1);

        server.staff.updateCache({ Admins: {}, Mods: { '2': 'Bob' }, Helpers: {} });
        expect(removed).toEqual([['Alex', 'Admin']]);
        expect(added).toEqual([['Alex', 'Admin'], ['Bob', 'Mod']]);
        expect(server.staff.admins.size).toBe(0);
        expect(server.staff.mods.size).toBe(1);

        client.destroy();
    });
});
