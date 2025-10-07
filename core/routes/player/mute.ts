const modulename = 'WebServer:PlayerMute';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { PlayerClass } from '@lib/player/playerClasses';
import { anyUndefined, calcExpirationFromDuration } from '@lib/misc';
import consoleFactory from '@lib/console';
import { sendMuteLog } from '@modules/DiscordBot/discordHelpers';

const console = consoleFactory(modulename);

/**
 * Handle Mute Player Action
 */
export async function handleMute(ctx: AuthedCtx, player: PlayerClass): Promise<{ success: boolean; error?: string }> {
    //Checking request
    if (anyUndefined(ctx.request.body, ctx.request.body.duration, ctx.request.body.reason)) {
        return { error: 'Invalid request.' };
    }
    const durationInput = ctx.request.body.duration.trim();
    const reason = (ctx.request.body.reason as string).trim() || 'no reason provided';

    //Calculating expiration/duration
    let calcResults;
    try {
        calcResults = calcExpirationFromDuration(durationInput);
    } catch (error) {
        return { error: (error as Error).message };
    }
    const { expiration } = calcResults;

    //Check permissions
    if (!ctx.admin.testPermission('players.mute', modulename)) {
        return { error: "You don't have permission to execute this action." };
    }

    //Validating player
    if (!player.license) {
        return { error: 'Cannot mute a player without a license identifier.' };
    }

    //Mute player
    try {
        exports['pma-voice'].mutePlayer(player.license, ctx.admin.name, reason, expiration);
    } catch (error) {
        return { error: `Failed to mute player on pma-voice: ${(error as Error).message}` };
    }

    //Register action
    try {
        txCore.database.actions.registerMute(
            player.getAllIdentifiers(),
            ctx.admin.name,
            reason,
            expiration,
            player.displayName
        );
    } catch (error) {
        return { error: `Failed to register mute action: ${(error as Error).message}` };
    }
    ctx.admin.logAction(`Muted player "${player.displayName}": ${reason}`);

    //Send discord log
    sendMuteLog(ctx.admin.name, player, reason, durationInput, false);

    return { success: true };
}

/**
 * Handle Unmute Player Action
 */
export async function handleUnmute(ctx: AuthedCtx, player: PlayerClass): Promise<{ success: boolean; error?: string }> {
    //Check permissions
    if (!ctx.admin.testPermission('players.mute', modulename)) {
        return { error: "You don't have permission to execute this action." };
    }

    //Validating player
    if (!player.license) {
        return { error: 'Cannot unmute a player without a license identifier.' };
    }

    //Unmute player
    try {
        exports['pma-voice'].unmutePlayer(player.license);
    } catch (error) {
        return { error: `Failed to unmute player on pma-voice: ${(error as Error).message}` };
    }

    //Revoke action in database
    try {
        const activeMute = player.getHistory().find(a => a.type === 'mute' && a.revocation.timestamp === null);
        if (activeMute) {
            txCore.database.actions.approveRevoke(activeMute.id, ctx.admin.name, true, 'Unmuted');
        }
    } catch (error) {
        console.warn(`Failed to revoke mute action: ${(error as Error).message}`);
    }
    ctx.admin.logAction(`Unmuted player "${player.displayName}".`);

    //Send discord log
    sendMuteLog(ctx.admin.name, player, 'N/A', 'N/A', true);

    return { success: true };
}