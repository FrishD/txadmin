const modulename = 'WebServer:GetApprovers';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/**
 * Returns a list of admins with the 'players.approve_bans' permission.
 */
export default async function GetApprovers(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.testPermission('players.ban', modulename)) {
        return ctx.send({
            error: 'You don\'t have permission to execute this action.',
        });
    }

    try {
        const approvers = txCore.adminStore.getAdminsWithPermission('players.approve_bans');
        return ctx.send(approvers);
    } catch (error) {
        return ctx.send({
            error: `Failed to retrieve approvers: ${(error as Error).message}`,
        });
    }
};
