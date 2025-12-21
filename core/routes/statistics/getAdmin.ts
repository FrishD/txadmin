const modulename = 'WebServer:GetAdminStats';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/**
 * Returns detailed statistics for a single admin
 */
export default async function GetAdminStats(ctx: AuthedCtx) {
    const adminName = ctx.params.name;

    //Check permissions
    //NOTE: this is a good candidate for a new permission
    if (!ctx.admin.testPermission('all_permissions', modulename)) {
        return ctx.send({
            error: 'You don\'t have permission to execute this action.',
        });
    }

    if (typeof adminName !== 'string' || !adminName.length) {
        return ctx.send({ error: 'Invalid admin name.' });
    }

    try {
        const admin = txCore.adminStore.getAdminByName(adminName);
        if (!admin) {
            return ctx.send({ error: 'Admin not found.' });
        }

        const actionStats = txCore.database.stats.getAdminActionStats(adminName);

        const discordId = admin.providers.discord?.id ?? null;
        let playTime = 0;
        let tsLastConnection = 0;

        const license = admin.providers.citizenfx?.identifier?.replace('fivem:', '');
        if (license && /^[0-9a-f]{40}$/i.test(license)) {
            const playerData = txCore.database.players.findOne(license);
            if (playerData) {
                playTime = playerData.playTime;
                tsLastConnection = playerData.tsLastConnection;
            }
        }

        const response = {
            ...actionStats,
            playTime,
            tsLastConnection,
            discordId,
        }

        return ctx.send(response);
    } catch (error) {
        return ctx.send({
            error: `Failed to retrieve admin stats: ${(error as Error).message}`,
        });
    }
};
