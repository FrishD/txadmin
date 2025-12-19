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
        const player = allPlayers.find(p => p.ids.some(id => admin.providers.discord?.identifier === id || admin.providers.citizenfx?.identifier === id));
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
