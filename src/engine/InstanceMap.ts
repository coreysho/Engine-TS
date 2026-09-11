import LocType from '#/cache/config/LocType.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import World from '#/engine/World.js';

/**
 * Instanced regions (custom, 2026-09-11 - Construction / player-owned houses).
 *
 * An instance is a block of real world coordinates, far from any map square, whose zones are
 * filled by copying 8x8 source zones ("templates") from elsewhere in the map, optionally rotated.
 * The server holds the copy (GameMap.applyZoneTemplate: collision + locs), and players standing in it are
 * sent REBUILD_REGION instead of REBUILD_NORMAL so the client builds the same scene from the same
 * templates (BuildArea.rebuildNormal).
 *
 * Slots are INSTANCE_ZONES x INSTANCE_ZONES zones (128 x 128 tiles), laid out in a GRID x GRID
 * block starting at (BASE_X, BASE_Z). Everything about the layout is here and nowhere else.
 *   x 6400..10495, z 6400..10495: no map square exists there, it is outside both wilderness
 *   rectangles (Player.isInWilderness), and every coordinate stays well inside the 14-bit coord
 *   packing and the 2048-zone ZoneMap/collision indexing.
 */
export default class InstanceMap {
    static readonly BASE_X: number = 6400;
    static readonly BASE_Z: number = 6400;
    static readonly INSTANCE_ZONES: number = 16;
    static readonly GRID: number = 32;
    private static readonly SIZE: number = InstanceMap.INSTANCE_ZONES * 8;

    private static readonly instances: Map<number, Instance> = new Map();

    // One counter for every instance, not one per instance: a slot is reused as soon as it is freed, and
    // a fresh instance counting from 0 again would reach the same (slot, version) pair the player's
    // client last built - BuildArea would see "nothing changed" and the old scene would stay up. That
    // is exactly what ::~pohtest 1 after ::~pohtest 0 did (2026-09-11).
    private static versionCounter: number = 0;

    static nextVersion(): number {
        return ++InstanceMap.versionCounter;
    }

    /** The instance containing this tile, if any. */
    static at(x: number, z: number): Instance | null {
        const slot = InstanceMap.slotOf(x, z);
        return slot === -1 ? null : (InstanceMap.instances.get(slot) ?? null);
    }

    static slotOf(x: number, z: number): number {
        const sx = Math.floor((x - InstanceMap.BASE_X) / InstanceMap.SIZE);
        const sz = Math.floor((z - InstanceMap.BASE_Z) / InstanceMap.SIZE);
        if (sx < 0 || sz < 0 || sx >= InstanceMap.GRID || sz >= InstanceMap.GRID) {
            return -1;
        }
        return sx + sz * InstanceMap.GRID;
    }

    static create(): Instance | null {
        for (let slot = 0; slot < InstanceMap.GRID * InstanceMap.GRID; slot++) {
            if (!InstanceMap.instances.has(slot)) {
                const inst = new Instance(slot, InstanceMap.BASE_X + (slot % InstanceMap.GRID) * InstanceMap.SIZE, InstanceMap.BASE_Z + Math.floor(slot / InstanceMap.GRID) * InstanceMap.SIZE);
                InstanceMap.instances.set(slot, inst);
                return inst;
            }
        }
        return null;
    }

    static delete(inst: Instance): void {
        for (const key of Array.from(inst.templates.keys())) {
            const { level, zx, zz } = Instance.unpackKey(key);
            World.gameMap.purgeZone(inst.baseX + zx * 8, inst.baseZ + zz * 8, level);
        }
        inst.templates.clear();
        inst.version = InstanceMap.nextVersion();
        InstanceMap.instances.delete(inst.slot);
    }

    /** REBUILD_REGION template code for an absolute zone, or -1 (the client draws void). */
    static templateAt(level: number, zoneX: number, zoneZ: number): number {
        const inst = InstanceMap.at(zoneX << 3, zoneZ << 3);
        if (!inst) {
            return -1;
        }
        return inst.templates.get(Instance.packKey(level, zoneX - (inst.baseX >> 3), zoneZ - (inst.baseZ >> 3))) ?? -1;
    }

    static count(): number {
        return InstanceMap.instances.size;
    }
}

export class Instance {
    readonly slot: number;
    readonly baseX: number;
    readonly baseZ: number;
    /** (level, local zone) -> client template code: srcLevel << 24 | srcZoneX << 14 | srcZoneZ << 3 | rot << 1 */
    readonly templates: Map<number, number> = new Map();
    /** Bumped on every template change, so BuildArea knows to resend the region to players inside. */
    version: number = InstanceMap.nextVersion();

    constructor(slot: number, baseX: number, baseZ: number) {
        this.slot = slot;
        this.baseX = baseX;
        this.baseZ = baseZ;
    }

    static packKey(level: number, zx: number, zz: number): number {
        return ((level & 0x3) << 16) | ((zx & 0xff) << 8) | (zz & 0xff);
    }

    static unpackKey(key: number): { level: number; zx: number; zz: number } {
        return { level: (key >> 16) & 0x3, zx: (key >> 8) & 0xff, zz: key & 0xff };
    }

    contains(x: number, z: number): boolean {
        return InstanceMap.at(x, z) === this;
    }

    /**
     * Hide (remove) or show again every template loc of a category across the whole instance - how a
     * house leaves build mode: its hotspots (category poh_hotspot) go, and with them the door hotspots
     * that otherwise wall off every doorway. Removed static locs stay in their zone, inactive, so the
     * client is told (LOC_DEL) and showing them again is just World.addLoc.
     */
    setCategoryVisible(category: number, visible: boolean): number {
        let changed = 0;
        for (const key of this.templates.keys()) {
            const { level, zx, zz } = Instance.unpackKey(key);
            const zone = World.gameMap.getZone(this.baseX + zx * 8, this.baseZ + zz * 8, level);
            for (const loc of Array.from(zone.getAllLocsUnsafe())) {
                if (loc.lifecycle !== EntityLifeCycle.RESPAWN || LocType.get(loc.type).category !== category) {
                    continue;
                }
                if (!visible && loc.isActive) {
                    World.removeLoc(loc, 0);
                    changed++;
                } else if (visible && !loc.isActive) {
                    World.addLoc(loc, 0);
                    changed++;
                }
            }
        }
        return changed;
    }

    static decodeTemplate(code: number): { srcLevel: number; srcX: number; srcZ: number; rot: number } {
        return { srcLevel: (code >> 24) & 0x3, srcX: ((code >> 14) & 0x3ff) << 3, srcZ: ((code >> 3) & 0x7ff) << 3, rot: (code >> 1) & 0x3 };
    }

    /** Lay source zone (srcX, srcZ, srcLevel) over the instance zone containing (x, z, level). */
    setZone(x: number, z: number, level: number, srcX: number, srcZ: number, srcLevel: number, rot: number): boolean {
        if (!this.contains(x, z) || !World.gameMap.hasMapsquare(srcX, srcZ)) {
            return false;
        }
        const zx = (x - this.baseX) >> 3;
        const zz = (z - this.baseZ) >> 3;
        this.unapply(zx, zz, level);
        const code = ((srcLevel & 0x3) << 24) | (((srcX >> 3) & 0x3ff) << 14) | (((srcZ >> 3) & 0x7ff) << 3) | ((rot & 0x3) << 1);
        World.gameMap.applyZoneTemplate(srcX, srcZ, srcLevel, this.baseX + zx * 8, this.baseZ + zz * 8, level, rot, true, true, true);
        this.templates.set(Instance.packKey(level, zx, zz), code);
        this.restoreNeighbours(zx, zz, level);
        this.version = InstanceMap.nextVersion();
        return true;
    }

    clearZone(x: number, z: number, level: number): void {
        if (!this.contains(x, z)) {
            return;
        }
        const zx = (x - this.baseX) >> 3;
        const zz = (z - this.baseZ) >> 3;
        this.unapply(zx, zz, level);
        this.restoreNeighbours(zx, zz, level);
        this.version = InstanceMap.nextVersion();
    }

    /**
     * Take a zone's collision back off - including what its walls flagged across the edge in the
     * zones next to it - then empty it. The client never has this problem (it rebuilds the whole
     * scene); the server edits one zone at a time, so the order matters: see restoreNeighbours.
     */
    private unapply(zx: number, zz: number, level: number): void {
        const key = Instance.packKey(level, zx, zz);
        const code = this.templates.get(key);
        const x = this.baseX + zx * 8;
        const z = this.baseZ + zz * 8;
        if (code !== undefined) {
            const t = Instance.decodeTemplate(code);
            World.gameMap.applyZoneTemplate(t.srcX, t.srcZ, t.srcLevel, x, z, level, t.rot, false, true, false, true);
            World.gameMap.applyLiveLocCollision(x, z, level, false);
        }
        World.gameMap.purgeZone(x, z, level);
        this.templates.delete(key);
    }

    /**
     * Put back the neighbours' collision after a zone changed: the removal above can clear a bit a
     * neighbour also sets (two walls on one shared edge), and a freshly copied zone starts from zero,
     * so it has lost whatever the neighbours' edge walls flagged inside it. Collision adds are ORs, so
     * re-adding a neighbour's own tiles changes nothing. Template locs that are not `active` never
     * reach a zone's loc list (GameMap.loadLocations does the same), so they come from the template;
     * everything live in the zone - including hotspots a script has since turned into furniture - comes
     * from the zone as it is now.
     */
    private restoreNeighbours(zx: number, zz: number, level: number): void {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const code = this.templates.get(Instance.packKey(level, zx + dx, zz + dz));
                if (code === undefined || (dx === 0 && dz === 0)) {
                    continue;
                }
                const x = this.baseX + (zx + dx) * 8;
                const z = this.baseZ + (zz + dz) * 8;
                const t = Instance.decodeTemplate(code);
                World.gameMap.applyZoneTemplate(t.srcX, t.srcZ, t.srcLevel, x, z, level, t.rot, true, false, false, true);
                World.gameMap.applyLiveLocCollision(x, z, level, true);
            }
        }
        // last, once every edge wall is back: the restores above are what allocate empty zones
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (!this.templates.has(Instance.packKey(level, zx + dx, zz + dz))) {
                    this.blockVoid(zx + dx, zz + dz, level);
                }
            }
        }
    }

    /**
     * A zone with no template is void: the client draws nothing there and its collision map treats it
     * as blocked. An unallocated server zone reads blocked too - but a wall on the edge of the room next
     * door flags a tile on this side, which allocates the zone with every other tile OPEN, and the
     * server would then let a player walk out into the dark. Floor-block the whole thing instead; the
     * next setZone here purges it anyway.
     */
    private blockVoid(zx: number, zz: number, level: number): void {
        const x = this.baseX + zx * 8;
        const z = this.baseZ + zz * 8;
        if (this.contains(x, z)) {
            World.gameMap.floorBlockZoneIfAllocated(x, z, level);
        }
    }
}
