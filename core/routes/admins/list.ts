const modulename = 'WebServer:GetAdmins';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/**
 * Returns a list of all configured admins.
 */
export default async function GetAdmins(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.testPermission('manage.admins', modulename)) {
        return ctx.send({
            error: 'You don\'t have permission to execute this action.',
        });
    }

    try {
        const admins = txCore.adminStore.getAdminsList();
        const adminNames = admins.map(a => a.name);
        return ctx.send(adminNames);
    } catch (error) {
        return ctx.send({
            error: `Failed to retrieve admins: ${(error as Error).message}`,
        });
    }
};
