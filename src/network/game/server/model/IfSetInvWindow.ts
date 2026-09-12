import ServerGameMessage from '#/network/game/server/ServerGameMessage.js';

export default class IfSetInvWindow extends ServerGameMessage {
    constructor(
        readonly component: number,
        readonly first: number,
        readonly count: number
    ) {
        super();
    }
}
