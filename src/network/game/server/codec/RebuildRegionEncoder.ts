import Packet from '#/io/Packet.js';
import ServerGameMessageEncoder from '#/network/game/server/ServerGameMessageEncoder.js';
import ServerGameProt from '#/network/game/server/ServerGameProt.js';
import RebuildRegion from '#/network/game/server/model/RebuildRegion.js';

// Mirrors Client.java's ptype 53 reader: g2_alt2 zoneX, then bit access - for each level, x, z of
// the 13x13 scene a 1-bit "present" flag and, if set, the 26-bit template code - then byte access
// and g2_alt2 zoneZ.
export default class RebuildRegionEncoder extends ServerGameMessageEncoder<RebuildRegion> {
    prot = ServerGameProt.REBUILD_REGION;

    encode(buf: Packet, message: RebuildRegion): void {
        buf.p2_alt2(message.zoneX);
        buf.bitPos = buf.pos << 3;
        for (let i = 0; i < 4 * 13 * 13; i++) {
            const code = message.templates[i];
            if (code === -1) {
                buf.pBit(1, 0);
            } else {
                buf.pBit(1, 1);
                buf.pBit(26, code);
            }
        }
        buf.pos = (buf.bitPos + 7) >>> 3;
        buf.p2_alt2(message.zoneZ);
    }

    test(message: RebuildRegion): number {
        let bits = 0;
        for (let i = 0; i < message.templates.length; i++) {
            bits += message.templates[i] === -1 ? 1 : 27;
        }
        return 4 + ((bits + 7) >>> 3);
    }
}
