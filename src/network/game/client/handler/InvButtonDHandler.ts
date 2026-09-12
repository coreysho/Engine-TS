import Component from '#/cache/config/Component.js';
import Player from '#/engine/entity/Player.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';
import ScriptRunner from '#/engine/script/ScriptRunner.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import ClientGameMessageHandler from '#/network/game/client/ClientGameMessageHandler.js';
import InvButtonD from '#/network/game/client/model/InvButtonD.js';
import UpdateInvPartial from '#/network/game/server/model/UpdateInvPartial.js';
import Environment from '#/util/Environment.js';

export default class InvButtonDHandler extends ClientGameMessageHandler<InvButtonD> {
    handle(message: InvButtonD, player: Player): boolean {
        const { com: comId, slot, targetSlot, mode } = message;

        const com = Component.get(comId);
        if (typeof com === 'undefined' || (!com.draggable && !com.swappable)) {
            // bad client: component is not acceptable for this packet
            return false;
        } else if (!player.isComponentVisible(com)) {
            // bad client or lag: component is not visible
            return false;
        }

        const listener = player.invListeners.find(l => l.com === comId);
        const inv = player.getInventoryFromListener(listener);
        if (!inv) {
            // bad client or lag: inventory is not transmitted to client
            return false;
        }

        if (!inv.validSlot(slot) || !inv.validSlot(targetSlot)) {
            // bad client: real inventory is smaller
            return false;
        } else if (!inv.get(slot)) {
            // bad client or lag: item does not exist in inventory
            return false;
        }

        if (player.delayed) {
            // normal: revert the client visual while delayed
            player.write(new UpdateInvPartial(comId, inv, slot, targetSlot));
            return false;
        }

        player.lastSlot = slot;
        player.lastTargetSlot = targetSlot;
        // The mode byte used to be decoded and thrown away. Scripts need it now: the client sets
        // it to 100 + n when a drag was dropped on bank tab n, which is the only way that gesture
        // can be expressed - this packet carries ONE component and both slots have to be valid
        // slots of that same inv, so a tab button cannot be the target.
        player.lastDragMode = mode;

        const script = ScriptProvider.getByTrigger(ServerTriggerType.INV_BUTTOND, comId);
        if (script) {
            const root = Component.get(com.rootLayer);
            player.executeScript(ScriptRunner.init(script, player), root.overlay == false);
        } else if (Environment.NODE_DEBUG) {
            player.messageGame(`No trigger for [inv_buttond,${com.comName}]`);
        }

        return true;
    }
}
