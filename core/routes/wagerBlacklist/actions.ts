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
    const warnings = [];
    if (txConfig.discordBot.wagerBlacklistRole) {
        try {
            const discordId = action.ids.find(id => id.startsWith('discord:'));
            if (discordId) {
                const uid = discordId.substring(8);
                const member = await txCore.discordBot.guild?.members.fetch(uid);
                if (member) {
                    await member.roles.remove(txConfig.discordBot.wagerBlacklistRole);
                    if (txConfig.discordBot.wagerRevokeLogChannel) {
                        const logSent = await sendWagerBlacklistLog(txConfig.discordBot.wagerRevokeLogChannel, ctx.admin.name, member, reason, true);
                        if (!logSent) {
                            warnings.push('Failed to send the wager blacklist revocation log to the configured channel.');
                        }
                    }
                } else {
                    warnings.push('Could not find the discord user to remove the role from.');
                }
            }
        } catch (error) {
            warnings.push(`Failed to remove the wager blacklist role from the user: ${(error as Error).message}`);
            console.error(`Failed to remove role or send log: ${(error as Error).message}`);
        }
    }

    ctx.admin.logAction(`Revoked wager blacklist for action ID ${actionId}.`);

    if (warnings.length) {
        return ctx.send({ success: true, warnings });
    } else {
        return ctx.send({ success: true });
    }
};
