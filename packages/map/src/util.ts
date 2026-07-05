import type { MapType } from "./enums";

/**
 * Fetches headshots of players from the Roblox API.
 * @param userIds - The userIds to get the headshots for.
 * @param size - The image size, defaults to 60x60px.
 * @returns Map of all player headshots that were successfully returned by the Roblox API.
 * @public
 */
export async function fetchRobloxHeadshots(userIds: number[], size: string = '60x60'): Promise<Map<number, string>> {
    const query = new URLSearchParams({
        userIds: userIds.join(','),
        includeBackground: 'false',
        size,
        format: 'Png',
        isCircular: 'true',
    })
    const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?${query}`);
    if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
    const responseJSON = await response.json();
    const data = Array.isArray(responseJSON?.data) ? responseJSON.data : [];
    const headshots = new Map<number, string>();
    for (const item of data) {
        const userId = item.targetId;
        const imageUrl = item.imageUrl;
        if (userId && imageUrl) headshots.set(userId, imageUrl);
    }
    return headshots;
}

/**
 * Fetches the map from the ER:LC API.
 * @param map - The map type to fetch.
 * @returns Array Buffer of the map.
 * @public
 */
export async function fetchMap(map: MapType): Promise<ArrayBuffer> {
    const response = await fetch(`https://api.erlc.gg/maps/${map}`);
    return await response.arrayBuffer();
}