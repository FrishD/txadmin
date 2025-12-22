const modulename = 'WebServer:GetApprovers';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { AuthedAdmin } from '@modules/WebServer/authLogic';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/**
 * Returns a list of admins with the 'players.approve_bans' permission.
 */
export default async function GetApprovers(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.testPermission('web.pc_checker', modulename)) {
        return ctx.send({
            error: 'You don\'t have permission to execute this action.',
        });
    }

    try {
        const allAdmins = txCore.adminStore.getRawAdminsList().map(adminData => new AuthedAdmin(adminData));
        const approvers = allAdmins
            .filter(admin => admin.hasPermission('all_permissions') || admin.hasPermission('manage.admins'))
            .map(admin => admin.name);
        return ctx.send(approvers);
    } catch (error) {
        return ctx.send({
            error: `Failed to retrieve approvers: ${(error as Error).message}`,
        });
    }
};
