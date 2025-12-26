import { AuthedCtx } from '@modules/WebServer/ctxTypes';

//Handler for POST /player/target
export default async function PlayerTarget(ctx: AuthedCtx) {
    //Sanity check
    const { license, reason } = ctx.request.body;
    if (typeof license !== 'string' || typeof reason !== 'string' || !reason.length) {
        return ctx.send({ error: 'Invalid request body.' });
    }

    //Check permissions
    if (!ctx.admin.testPermission('players.manage') && !ctx.admin.testPermission('players.pc_check')) {
        return ctx.send({ error: 'You don\'t have permission to execute this action.' });
    }

    //Get player
    const player = txCore.db.players.findOne(license);
    if (!player) {
        return ctx.send({ error: 'Player not found.' });
    }
    const { ids, displayName } = player;

    try {
        const actionId = txCore.db.actions.registerTarget(ids, ctx.admin.name, reason, displayName);
        ctx.admin.logAction(`Targeted player ${displayName} (${license}) with reason: ${reason}`);
        const action = txCore.db.actions.findOne(actionId);
        return ctx.send(action);
    } catch (error) {
        return ctx.send({ error: `Failed to target player: ${(error as Error).message}` });
    }
};
