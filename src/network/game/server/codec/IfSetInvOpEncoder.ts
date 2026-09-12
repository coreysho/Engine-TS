import Packet from '#/io/Packet.js';
import ServerGameMessageEncoder from '#/network/game/server/ServerGameMessageEncoder.js';
import ServerGameProt from '#/network/game/server/ServerGameProt.js';
import IfSetInvOp from '#/network/game/server/model/IfSetInvOp.js';

export default class IfSetInvOpEncoder extends ServerGameMessageEncoder<IfSetInvOp> {
    prot = ServerGameProt.IF_SETINVOP;

    encode(buf: Packet, message: IfSetInvOp): void {
        buf.p2(message.component);
        buf.p1(message.op);
        buf.pjstr(message.text);
    }

    test(message: IfSetInvOp): number {
        return 2 + 1 + 1 + message.text.length;
    }
}
