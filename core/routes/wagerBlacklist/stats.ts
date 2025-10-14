const modulename = 'WebServer:WagerBlacklistStats';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { WagerBlacklistStatsResp } from '@shared/wagerBlacklistApiTypes';
import { now } from '@lib/misc';
const console = consoleFactory(modulename);

/**
 * Returns statistics about wager blacklists
 */
export default async function WagerBlacklistStats(ctx: AuthedCtx) {
    const sendTypedResp = (data: WagerBlacklistStatsResp) => ctx.send(data);
    try {
        const dbo = txCore.database.getDboRef();
        const sevenDaysAgo = now() - (7 * 24 * 60 * 60);
        const stats = dbo.chain.get('actions')
            .filter({ type: 'wagerblacklist' })
            .reduce((acc, action) => {
                acc.total++;
                if (action.revocation.timestamp) {
                    acc.revoked++;
                } else {
                    acc.active++;
                }
                if (action.timestamp > sevenDaysAgo) {
                    acc.last7days++;
                }
                return acc;
            }, {
                total: 0,
                active: 0,
                revoked: 0,
                last7days: 0,
            })
            .value();

        return sendTypedResp(stats);
    } catch (error) {
        const msg = `WagerBlacklistStats failed with error: ${(error as Error).message}`;
        console.verbose.error(msg);
        return sendTypedResp({ error: msg });
    }
};
