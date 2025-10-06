const modulename = 'WebServer:WagerBlacklistActions';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { sendWagerBlacklistLog } from '@modules/DiscordBot/discordHelpers';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/**
 * Handles the revocation of a wager blacklist
 */
export default async function WagerBlacklistActions(ctx: AuthedCtx) {
    //Check if discord bot is ready
    if (!txCore.discordBot.isClientReady) {
        return ctx.send({ error: 'Discord bot is not ready. Please try again in a few seconds.' });
    }

    if (typeof ctx.request.body !== 'object' || ctx.request.body === null) {
        return ctx.utils.error(400, 'Invalid Request Body');
    }
    const { actionId, reason } = ctx.request.body as { actionId: string, reason: string };

    //Check permissions
    if (!ctx.admin.testPermission('wager.head', modulename)) {
        return ctx.send({
            error: 'You do not have permission to execute this action.',
        });
    }

    //Find action
    const action = txCore.database.actions.findOne(actionId);
    if (!action || action.type !== 'wagerblacklist') {
        return ctx.send({ error: 'Action not found or not a wager blacklist.' });
    }

    //Revoke action
    try {
        txCore.database.actions.approveRevoke(actionId, ctx.admin.name, true, reason);
    } catch (error) {
        return ctx.send({ error: `Failed to revoke wager blacklist: ${(error as Error).message}` });
    }

    //Remove role & send log
    if (txConfig.discordBot.wagerBlacklistRole) {
        try {
            const discordId = action.ids.find(id => id.startsWith('discord:'));
            if (discordId) {
                const uid = discordId.substring(8);
                await txCore.discordBot.removeMemberRole(uid, txConfig.discordBot.wagerBlacklistRole);
                if (txConfig.discordBot.wagerRevokeLogChannel) {
                    const member = await txCore.discordBot.guild?.members.fetch(uid);
                    if(member) sendWagerBlacklistLog(txConfig.discordBot.wagerRevokeLogChannel, ctx.admin.name, member, reason, true);
                }
            }
        } catch (error) {
            //Don't fail the whole command if the role removal fails
            console.error(`Failed to remove role or send log: ${(error as Error).message}`);
        }
    }

    ctx.admin.logAction(`Revoked wager blacklist for action ID ${actionId}.`);

    return ctx.send({ success: true });
};
