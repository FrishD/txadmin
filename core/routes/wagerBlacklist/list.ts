const modulename = 'WebServer:WagerBlacklistList';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import Fuse from 'fuse.js';
import { parseLaxIdsArrayInput } from '@lib/player/idUtils';
const console = consoleFactory(modulename);

/**
 * Returns the list of wager blacklisted players
 */
export default async function WagerBlacklistList(ctx: AuthedCtx) {
    const dbo = txCore.database.getDboRef();
    let allActions = dbo.chain.get('actions').cloneDeep().value();
    let actions = allActions
        .filter(a => a.type === 'wagerblacklist' && !a.revocation.timestamp);

    const { type, value } = ctx.query;
    if (type && value && typeof type === 'string' && typeof value === 'string') {
        if (type === 'playerName') {
            const fuse = new Fuse(actions, {
                keys: ['playerName'],
                threshold: 0.3,
            });
            actions = fuse.search(value).map(x => x.item);
        } else if (type === 'identifiers') {
            const { validIds } = parseLaxIdsArrayInput(value);
            if (validIds.length) {
                actions = actions.filter(a => validIds.some(id => a.ids.includes(id)));
            }
        }
    }

    return ctx.send(actions);
};
