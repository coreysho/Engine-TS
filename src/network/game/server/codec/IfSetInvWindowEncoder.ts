import Packet from '#/io/Packet.js';
import ServerGameMessageEncoder from '#/network/game/server/ServerGameMessageEncoder.js';
import ServerGameProt from '#/network/game/server/ServerGameProt.js';
import IfSetInvWindow from '#/network/game/server/model/IfSetInvWindow.js';

export default class IfSetInvWindowEncoder extends ServerGameMessageEncoder<IfSetInvWindow> {
    prot = ServerGameProt.IF_SETINVWINDOW;

    encode(buf: Packet, message: IfSetInvWindow): void {
        buf.p2(message.component);
        buf.p2(message.first);
        buf.p2(message.count);
    }
}
