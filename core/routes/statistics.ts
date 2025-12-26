const modulename = 'WebServer:Statistics';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { now } from '@lib/misc';
const console = consoleFactory(modulename);

/**
 * Returns the statistics data
 */
export default async function Statistics(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.testPermission('manage.admins', modulename)) {
        return ctx.utils.error(403, 'You don\'t have permission to view this page.');
    }

    //Get data
    const allPlayers = txCore.database.players.getRaw();
    const allAdmins = txCore.adminStore.getRawAdminsList();

    //Calculate leaderboard stats
    const leaderboardData = allAdmins.map(admin => {
        const player = allPlayers.find(p => {
            if (!Array.isArray(p.ids)) {
                return false;
            }
            return p.ids.some(id => {
                if (typeof id !== 'string') {
                    return false;
                }
                const discordId = admin.providers.discord?.identifier;
                const citizenfxId = admin.providers.citizenfx?.identifier;
                if (discordId && discordId.toLowerCase() === id.toLowerCase()) {
                    return true;
                }
                if (citizenfxId && citizenfxId.toLowerCase() === id.toLowerCase()) {
                    return true;
                }
                return false;
            });
        });
        const actionStats = txCore.database.stats.getAdminActionStats(admin.name);
        return {
            name: admin.name,
            playTime: player?.playTime ?? 0,
            tsLastConnection: player?.tsLastConnection ?? 0,
            ...actionStats,
        };
    });

    //Calculate KPIs
    const allActions = txCore.database.actions.getRaw();
    const currentTimestamp = now();
    const activeBans = allActions.filter(a => a.type === 'ban' && !a.revocation.timestamp && (a.expiration === false || a.expiration > currentTimestamp)).length;
    const bansGiven = allActions.filter(a => a.type === 'ban').length;
    const warnsGiven = allActions.filter(a => a.type === 'warn').length;
    const mutesGiven = allActions.filter(a => a.type === 'mute').length;


    const out = {
        activeBans,
        bansGiven,
        warnsGiven,
        mutesGiven,
        leaderboardData,
    };
    return ctx.send(out);
};
