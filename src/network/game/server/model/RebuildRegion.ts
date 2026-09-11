import ServerGameMessage from '#/network/game/server/ServerGameMessage.js';

/**
 * REBUILD_REGION: the client builds its 13x13-zone scene from copied template zones instead of the
 * map squares under it (custom use, 2026-09-11 - instanced player-owned houses).
 * `templates` is 4 * 13 * 13, indexed [(level * 13 + x) * 13 + z], each entry the template code
 * (srcLevel << 24 | srcZoneX << 14 | srcZoneZ << 3 | rot << 1) or -1 for an empty zone.
 */
export default class RebuildRegion extends ServerGameMessage {
    constructor(
        readonly zoneX: number,
        readonly zoneZ: number,
        readonly templates: Int32Array
    ) {
        super();
    }
}
