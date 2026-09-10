import InvType from '#/cache/config/InvType.js';
import { NetworkPlayer } from '#/engine/entity/NetworkPlayer.js';
import Player, { getExpByLevel, getLevelByExp } from '#/engine/entity/Player.js';
import { PLAYER_STAT_COUNT, PlayerStat } from '#/engine/entity/PlayerStat.js';
import World from '#/engine/World.js';
import Packet from '#/io/Packet.js';
import ClientSocket from '#/server/ClientSocket.js';
import { fromBase37, toBase37 } from '#/util/JString.js';

export class PlayerLoading {
    public static readonly SAV_MAGIC: number = 0x2004;
    // 8: stat count prefix before the stats block (Construction, 2026-09-10). Versions <= 7 always
    //    hold exactly 21 stats. Once a save is written as 8, an engine still on 7 refuses it
    //    ("Unsupported save version") - back up data/players before deploying this.
    public static readonly SAV_VERSION: number = 8;

    static verify(sav: Packet) {
        if (sav.g2() !== PlayerLoading.SAV_MAGIC) {
            return false;
        }

        const version = sav.g2();
        if (version > PlayerLoading.SAV_VERSION) {
            return false;
        }

        sav.pos = sav.data.length - 4;
        const crc = sav.g4s();
        return crc === Packet.getcrc(sav.data, 0, sav.data.length - 4);
    }

    static load(name: string, sav: Packet, client: ClientSocket | null) {
        const hash64 = toBase37(name); // username or email.
        const name37 = toBase37(name); // always username.
        const safeName = fromBase37(name37); // always safe username.

        const player = client ? new NetworkPlayer(safeName, name37, hash64, client) : new Player(safeName, name37, hash64);

        player.lastConnected = World.currentTick;
        player.lastResponse = World.currentTick;

        if (sav.data.length < 2) {
            for (let i = 0; i < PLAYER_STAT_COUNT; i++) {
                player.stats[i] = 0;
                player.baseLevels[i] = 1;
                player.levels[i] = 1;
            }

            // hitpoints starts at level 10
            player.stats[PlayerStat.HITPOINTS] = getExpByLevel(10);
            player.baseLevels[PlayerStat.HITPOINTS] = 10;
            player.levels[PlayerStat.HITPOINTS] = 10;
            return player;
        }

        if (sav.g2() !== PlayerLoading.SAV_MAGIC) {
            throw new Error('Invalid save file');
        }

        const version = sav.g2();
        if (version > PlayerLoading.SAV_VERSION) {
            throw new Error('Unsupported save version');
        }

        sav.pos = sav.data.length - 4;
        const crc = sav.g4s();
        if (crc != Packet.getcrc(sav.data, 0, sav.data.length - 4)) {
            throw new Error('Incorrect save checksum');
        }

        sav.pos = 4;
        player.x = sav.g2();
        player.z = sav.g2();
        player.level = sav.g1();
        for (let i = 0; i < 7; i++) {
            player.body[i] = sav.g1();
            if (player.body[i] === 255) {
                player.body[i] = -1;
            }
        }
        for (let i = 0; i < 5; i++) {
            player.colors[i] = sav.g1();
        }
        player.gender = sav.g1();
        player.runenergy = sav.g2();
        if (version >= 2) {
            // oops playtime overflow
            player.playtime = sav.g4s();
        } else {
            player.playtime = sav.g2();
        }

        const statCount = version >= 8 ? sav.g1() : 21;
        for (let i = 0; i < statCount; i++) {
            const xp = sav.g4s();
            const level = sav.g1();
            if (i >= PLAYER_STAT_COUNT) {
                continue; // written by a newer engine with more stats - drop them rather than overrun
            }
            player.stats[i] = xp;
            player.baseLevels[i] = getLevelByExp(xp);
            player.levels[i] = level;
        }
        // stats this save predates (Construction for every v7 save) start at level 1, 0 xp - the
        // typed arrays default to 0, which would otherwise be read as level 0.
        for (let i = statCount; i < PLAYER_STAT_COUNT; i++) {
            player.stats[i] = 0;
            player.baseLevels[i] = 1;
            player.levels[i] = 1;
        }

        const varpCount = sav.g2();
        if (version >= 7) {
            for (let i = 0; i < varpCount; i++) {
                const id = sav.g2();
                player.vars[id] = sav.gVarInt();
            }
        } else {
            for (let i = 0; i < varpCount; i++) {
                player.vars[i] = sav.g4s();
            }
        }

        const invCount = sav.g1();
        for (let i = 0; i < invCount; i++) {
            const type = sav.g2();
            const invType = InvType.get(type);
            const size = version >= 5 ? sav.g2() : invType.size;

            const objs = [];
            for (let slot = 0; slot < size; slot++) {
                const id = sav.g2() - 1;
                if (id === -1) {
                    continue;
                }

                let count = sav.g1();
                if (count === 255) {
                    count = sav.g4s();
                }

                objs.push({ slot, id, count });
            }

            if (invType.scope === InvType.SCOPE_PERM) {
                const inv = player.getInventory(type);
                if (inv) {
                    for (const obj of objs) {
                        inv.set(obj.slot, { id: obj.id, count: obj.count });
                    }
                }
            }
        }

        // afk zones
        if (version >= 3) {
            const afkZones: number = sav.g1();
            for (let index: number = 0; index < afkZones; index++) {
                player.afkZones[index] = sav.g4s();
            }
            player.lastAfkZone = sav.g2();
        }

        // chat modes
        if (version >= 4) {
            const packedChatModes = sav.g1();
            player.publicChat = (packedChatModes >> 4) & 0b11;
            player.privateChat = (packedChatModes >> 2) & 0b11;
            player.tradeDuel = packedChatModes & 0b11;
        }

        // last login info
        if (version >= 6) {
            player.lastLoginTime = sav.g8();
        }

        player.combatLevel = player.getCombatLevel();

        return player;
    }
}
