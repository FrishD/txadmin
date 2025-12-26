import { AuthedCtx } from '@modules/WebServer/ctxTypes';

//Handler for POST /player/target
export default async function PlayerTarget(ctx: AuthedCtx) {
    //Sanity check
    if (typeof ctx.request.body?.license !== 'string') {
        return ctx.send({ error: 'Invalid request body.' });
    }
    const { license } = ctx.request.body;

    //Check permissions
    if (!ctx.admin.testPermission('players.manage')) {
        return ctx.send({ error: 'You don\'t have permission to execute this action.' });
    }

    try {
        const updatedPlayer = txCore.db.players.togglePlayerTarget(license, ctx.admin.name);
        ctx.admin.logAction(`Toggled target status for license ${license}.`);
        return ctx.send(updatedPlayer);
    } catch (error) {
        return ctx.send({ error: `Failed to toggle player target: ${(error as Error).message}` });
    }
};
