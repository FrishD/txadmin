const modulename = 'WebServer:HistoryActions';
import { GenericApiOkResp } from '@shared/genericApiTypes';
import { DatabaseActionType } from '@modules/Database/databaseTypes';
import { calcExpirationFromDuration, parseDurationToSeconds } from '@lib/misc';
import consts from '@shared/consts';
import humanizeDuration, { Unit } from 'humanize-duration';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { z } from 'zod';
import { sendRevokeApproval, sendWagerBlacklistLog } from '@modules/DiscordBot/discordHelpers';
const console = consoleFactory(modulename);

//Schema
const addLegacyBanBodySchema = z.object({
    identifiers: z.string().array(),
    reason: z.string().trim().min(3).max(2048),
    duration: z.string(),
});
export type ApiAddLegacyBanReqSchema = z.infer<typeof addLegacyBanBodySchema>;

const revokeActionBodySchema = z.object({
    actionId: z.string(),
    reason: z.string().optional(),
});
export type ApiRevokeActionReqSchema = z.infer<typeof revokeActionBodySchema>;

const modifyBanBodySchema = z.object({
    actionId: z.string(),
    duration: z.string(),
});
export type ApiModifyBanReqSchema = z.infer<typeof modifyBanBodySchema>;


/**
 * Endpoint to interact with the actions database.
 */
export default async function HistoryActions(ctx: AuthedCtx & { params: any }) {
    //Sanity check
    if (!ctx.params.action) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const action = ctx.params.action;
    const sendTypedResp = (data: GenericApiOkResp) => ctx.send(data);

    //Delegate to the specific action handler
    if (action === 'addLegacyBan') {
        return sendTypedResp(await handleBandIds(ctx));
    } else if (action === 'revokeAction') {
        return sendTypedResp(await handleRevokeAction(ctx));
    } else if (action === 'modifyBan') {
        return sendTypedResp(await handleModifyBan(ctx));
    } else {
        return sendTypedResp({ error: 'unknown action' });
    }
};


/**
 * Handle Ban Player IDs (legacy ban!)
 * This is only called from the players page, where you ban an ID array instead of a PlayerClass
 * Doesn't support HWIDs, only banning player does
 */
async function handleBandIds(ctx: AuthedCtx): Promise<GenericApiOkResp> {
    //Checking request
    const schemaRes = addLegacyBanBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return { error: 'Invalid request body.' };
    }
    const {
        reason,
        identifiers: identifiersInput,
        duration: durationInput
    } = schemaRes.data;

    //Filtering identifiers
    if (!identifiersInput.length) {
        return { error: 'You must send at least one identifier' };
    }
    const invalids = identifiersInput.filter((id) => {
        return (typeof id !== 'string') || !Object.values(consts.validIdentifiers).some((vf) => vf.test(id));
    });
    if (invalids.length) {
        return { error: 'Invalid IDs: ' + invalids.join(', ') };
    }
    const identifiers = [...new Set(identifiersInput)];


    //Calculating expiration/duration
    let calcResults;
    try {
        calcResults = calcExpirationFromDuration(durationInput);
    } catch (error) {
        return { error: (error as Error).message };
    }
    const { expiration, duration } = calcResults;

    //Check permissions
    if (!ctx.admin.testPermission('players.ban', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' }
    }

    //Register action
    let actionId;
    try {
        actionId = txCore.database.actions.registerBan(
            identifiers,
            ctx.admin.name,
            reason,
            expiration,
            false
        );
    } catch (error) {
        return { error: `Failed to ban identifiers: ${(error as Error).message}` };
    }
    ctx.admin.logAction(`Banned <${identifiers.join(';')}>: ${reason}`);

    // Dispatch `txAdmin:events:playerBanned`
    try {
        let kickMessage, durationTranslated;
        const tOptions: any = {
            author: ctx.admin.name,
            reason: reason,
        };
        if (expiration !== false && duration) {
            durationTranslated = txCore.translator.tDuration(
                duration * 1000,
                { units: ['d', 'h'] },
            );
            tOptions.expiration = durationTranslated;
            kickMessage = txCore.translator.t('ban_messages.kick_temporary', tOptions);
        } else {
            durationTranslated = null;
            kickMessage = txCore.translator.t('ban_messages.kick_permanent', tOptions);
        }
        txCore.fxRunner.sendEvent('playerBanned', {
            author: ctx.admin.name,
            reason,
            actionId,
            expiration,
            durationInput,
            durationTranslated,
            targetNetId: null,
            targetIds: identifiers,
            targetHwids: [],
            targetName: 'identifiers',
            kickMessage,
        });
    } catch (error) { }

    return { success: true };
}


/**
 * Handle modifying a ban's duration.
 * This is called from the player modal.
 */
async function handleModifyBan(ctx: AuthedCtx): Promise<GenericApiOkResp> {
    //Checking request
    const schemaRes = modifyBanBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return { error: 'Invalid request body.' };
    }
    const { actionId, duration: durationInput } = schemaRes.data;

    //Check permissions
    if (!ctx.admin.testPermission('players.ban', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' }
    }

    //Getting action
    const action = txCore.database.actions.findOne(actionId);
    if (!action) {
        return { error: 'Action not found.' };
    }
    if (action.type !== 'ban') {
        return { error: 'This action is not a ban.' };
    }
    if (action.revocation.timestamp) {
        return { error: 'This ban is revoked.' };
    }
    if (action.expiration === false) {
        return { error: 'This ban is permanent.' };
    }
    const originalDuration = action.expiration - action.timestamp;
    if (originalDuration > 345600) {
        return { error: 'This ban is longer than 4 days and cannot be modified.' };
    }

    //Calculating expiration
    let durationSeconds;
    try {
        durationSeconds = parseDurationToSeconds(durationInput);
    } catch (error) {
        return { error: (error as Error).message };
    }
    if (durationSeconds > 345600) {
        return { error: 'The new duration cannot be longer than 4 days.' };
    }
    const expiration = action.timestamp + durationSeconds;


    //Modify ban
    try {
        txCore.database.actions.modifyBanDuration(actionId, expiration, ctx.admin.name);
        ctx.admin.logAction(`Modified ban ${actionId} to ${durationInput}.`);
    } catch (error) {
        return { error: `Failed to modify ban: ${(error as Error).message}` };
    }

    //TODO: maybe dispatch a socket.io event to the player modal to refresh it?

    return { success: true };
}


/**
 * Handle revoke database action.
 * This is called from the player modal or the players page.
 */
async function handleRevokeAction(ctx: AuthedCtx): Promise<GenericApiOkResp> {
    //Checking request
    const schemaRes = revokeActionBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return { error: 'Invalid request body.' };
    }
    const { actionId, reason } = schemaRes.data;

    //Check permissions
    const perms = [];
    if (ctx.admin.hasPermission('players.ban')) perms.push('ban');
    if (ctx.admin.hasPermission('players.warn')) perms.push('warn');
    if (ctx.admin.hasPermission('players.mute')) perms.push('mute');
    if (ctx.admin.hasPermission('wager.head')) perms.push('wagerblacklist');
    if (!perms.length) {
        return { error: `You don't have permission to revoke any action.` };
    }

    //Getting action
    const action = txCore.database.actions.findOne(actionId);
    if (!action) {
        return { error: 'Action not found.' };
    }
    if (action.revocation.status === 'pending') {
        return { error: 'This action revocation is already pending approval.' };
    } else if (action.revocation.status === 'approved') {
        return { error: 'This action\'s revocation has already been approved.' };
    }

    //Check if action is a ban and if it's long
    const sevenDays = 7 * 24 * 60 * 60;
    if (
        action.type === 'ban' &&
        (action.expiration === false || (action.expiration && (action.expiration - action.timestamp) >= sevenDays))
    ) {
        try {
            const pendingAction = txCore.database.actions.setRevokePending(action.id, ctx.admin.name, reason);
            await sendRevokeApproval(pendingAction, ctx.admin);
            ctx.admin.logAction(`Requested revocation approval for action ${actionId}.`);
            return { success: true };
        } catch (error) {
            return { error: `Failed to request revocation: ${(error as Error).message}` };
        }
    }

    //Revoking action for non-long bans or warnings
    let revokedAction;
    try {
        revokedAction = txCore.database.actions.approveRevoke(actionId, ctx.admin.name, perms, reason) as DatabaseActionType;
        ctx.admin.logAction(`Revoked ${revokedAction.type} id ${actionId} from ${revokedAction.playerName ?? 'identifiers'}`);
    } catch (error) {
        return { error: `Failed to revoke action: ${(error as Error).message}` };
    }

    // Mute specific logic
    if (revokedAction.type === 'mute') {
        const license = revokedAction.ids.find(id => typeof id === 'string' && id.startsWith('license:'));
        if (license) {
            txCore.fxRunner.sendEvent('playerUnmuted', {
                author: ctx.admin.name,
                targetLicense: license,
                targetName: revokedAction.playerName,
            });
        }
    }

    // Wager blacklist specific logic
    if (revokedAction.type === 'wagerblacklist') {
        if (txConfig.discordBot.wagerBlacklistRole) {
            try {
                const discordId = revokedAction.ids.find(id => typeof id === 'string' && id.startsWith('discord:'));
                if (discordId) {
                    const uid = discordId.substring(8);
                    await txCore.discordBot.removeMemberRole(uid, txConfig.discordBot.wagerBlacklistRole);
                    if (txConfig.discordBot.wagerRevokeLogChannel) {
                        const member = await txCore.discordBot.guild?.members.fetch(uid);
                        if (member) {
                            sendWagerBlacklistLog(txConfig.discordBot.wagerRevokeLogChannel, ctx.admin.name, member, reason ?? 'no reason provided', true);
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to remove wager blacklist role or send log for action ${actionId}:`);
                console.error(error);
            }
        }
    }

    // Dispatch `txAdmin:events:actionRevoked`
    try {
        txCore.fxRunner.sendEvent('actionRevoked', {
            actionId: revokedAction.id,
            actionType: revokedAction.type,
            actionReason: revokedAction.reason,
            actionAuthor: revokedAction.author,
            playerName: revokedAction.playerName,
            playerIds: revokedAction.ids,
            playerHwids: 'hwids' in revokedAction ? revokedAction.hwids : [],
            revokedBy: ctx.admin.name,
        });
    } catch (error) { }

    return { success: true };
}