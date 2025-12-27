const modulename = 'WebServer:PlayerUntarget';
import playerResolver from '@lib/player/playerResolver';
import { GenericApiResp } from '@shared/genericApiTypes';
import { PlayerClass } from '@lib/player/playerClasses';
import { anyUndefined } from '@lib/misc';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { SYM_CURRENT_MUTEX } from '@lib/symbols';
const console = consoleFactory(modulename);


//Handler for POST /player/untarget
export default async function PlayerUntarget(ctx: AuthedCtx) {
    //Sanity check
    if (anyUndefined(ctx.query.license)) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const { mutex, netid, license } = ctx.query;
    const sendTypedResp = (data: GenericApiResp) => ctx.send(data);

    //Finding the player
    let player;
    try {
        const refMutex = mutex === 'current' ? SYM_CURRENT_MUTEX : mutex;
        player = playerResolver(refMutex, netid, license);
    } catch (error) {
        return sendTypedResp({ error: (error as Error).message });
    }

    //Check permissions
    if (!ctx.admin.testPermission('players.manage', modulename)) {
        return sendTypedResp({ error: 'You don\'t have permission to execute this action.' });
    }

    //Validating player
    const allIds = player.getAllIdentifiers();
    if (!allIds.length) {
        return sendTypedResp({ error: 'Cannot untarget a player with no identifiers.' });
    }

    //Revoke all active target actions
    try {
        await txCore.database.actions.revokeTarget(
            allIds,
            ctx.admin.name,
            'Untargeted by admin.'
        );
    } catch (error) {
        return sendTypedResp({ error: `Failed to untarget player: ${(error as Error).message}` });
    }
    ctx.admin.logAction(`Untargeted player "${player.displayName}".`);

    return sendTypedResp({ success: true });
};
