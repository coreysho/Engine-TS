import Packet from '#/io/Packet.js';
import ServerGameMessageEncoder from '#/network/game/server/ServerGameMessageEncoder.js';
import ServerGameProt from '#/network/game/server/ServerGameProt.js';
import IfSetInvBreaks from '#/network/game/server/model/IfSetInvBreaks.js';

export default class IfSetInvBreaksEncoder extends ServerGameMessageEncoder<IfSetInvBreaks> {
    prot = ServerGameProt.IF_SETINVBREAKS;

    encode(buf: Packet, message: IfSetInvBreaks): void {
        buf.p2(message.component);
        for (let i = 0; i < 8; i++) {
            buf.p2(message.breaks[i] ?? 0);
        }
    }
}
