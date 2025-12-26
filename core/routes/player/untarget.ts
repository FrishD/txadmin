import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { DatabaseActionType } from '@modules/Database/databaseTypes';

//Handler for POST /player/untarget
export default async function PlayerUntarget(ctx: AuthedCtx) {
    //Sanity check
    const { license } = ctx.request.body;
    if (typeof license !== 'string') {
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

    //Find the active target action
    const filter = (action: DatabaseActionType) => {
        return action.type === 'target' && !action.revocation.timestamp;
    };
    const activeTargets = txCore.db.actions.findMany(ids, undefined, filter);
    if (!activeTargets.length) {
        return ctx.send({ error: 'This player is not targeted.' });
    }
    const targetAction = activeTargets[0];


    try {
        const { action } = await txCore.db.actions.approveRevoke(targetAction.id, ctx.admin.name, true, 'Untargeted');
        ctx.admin.logAction(`Untargeted player ${displayName} (${license}).`);
        return ctx.send(action);
    } catch (error) {
        return ctx.send({ error: `Failed to untarget player: ${(error as Error).message}` });
    }
};
