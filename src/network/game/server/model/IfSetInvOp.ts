import ServerGameMessage from '#/network/game/server/ServerGameMessage.js';

export default class IfSetInvOp extends ServerGameMessage {
    constructor(
        readonly component: number,
        readonly op: number,
        readonly text: string
    ) {
        super();
    }
}
