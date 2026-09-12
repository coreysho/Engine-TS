import ServerGameMessage from '#/network/game/server/ServerGameMessage.js';

export default class IfSetInvBreaks extends ServerGameMessage {
    constructor(
        readonly component: number,
        readonly breaks: number[]
    ) {
        super();
    }
}
