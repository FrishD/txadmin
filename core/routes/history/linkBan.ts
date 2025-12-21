const modulename = 'WebServer:HistoryLinkBan';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/**
 * Links a ban to a PC Check action
 */
export default async function LinkBan(ctx: AuthedCtx) {
    //Sanity check
    if (
        typeof ctx.request.body.pcCheckId !== 'string'
        || typeof ctx.request.body.banId !== 'string'
    ) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }

    const { pcCheckId, banId } = ctx.request.body;

    //Check permissions
    if (!ctx.admin.testPermission('web.pc_checker', modulename)) {
        return ctx.send({
            error: 'You don\'t have permission to execute this action.',
        });
    }

    try {
        const updatedPcCheck = txCore.database.actions.linkBan(pcCheckId, banId);
        ctx.admin.logAction(`Linked ban ${banId} to PC Check ${pcCheckId}.`);
        return ctx.send({ success: true, updatedPcCheck });
    } catch (error) {
        return ctx.send({ error: `Failed to link ban: ${(error as Error).message}` });
    }
}
