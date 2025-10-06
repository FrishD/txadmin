const modulename = 'DiscordBot:cmd:revokewagerblacklist';
import { CommandInteraction, GuildMember } from 'discord.js';
import { embedder, ensurePermission, logDiscordAdminAction, sendWagerBlacklistLog } from '../discordHelpers';
import consoleFactory from '@lib/console';


export default async (interaction: CommandInteraction) => {
    //Check permissions
    const adminName = await ensurePermission(interaction, 'wager.head');
    if (typeof adminName !== 'string') return;

    //Get options
    const user = interaction.options.get('user')?.member as GuildMember;
    const reason = interaction.options.get('reason')?.value as string;

    if (!user || !reason) {
        return await interaction.reply(embedder.danger('Invalid arguments.'));
    }

    //Find active wager blacklist
    const identifiers = [`discord:${user.id}`];
    const activeBlacklist = txCore.database.actions.findMany(
        identifiers,
        undefined,
        { type: 'wagerblacklist', 'revocation.timestamp': null }
    );

    if (!activeBlacklist.length) {
        return await interaction.reply(embedder.warning('This user does not have an active wager blacklist.'));
    }

    //Revoke action
    try {
        txCore.database.actions.approveRevoke(activeBlacklist[0].id, adminName, true, reason);
    } catch (error) {
        return await interaction.reply(embedder.danger(`Failed to revoke wager blacklist: ${(error as Error).message}`));
    }

    //Remove role
    if (txConfig.discordBot.wagerBlacklistRole) {
        try {
            await user.roles.remove(txConfig.discordBot.wagerBlacklistRole);
        } catch (error) {
            //Don't fail the whole command if the role removal fails
            console.error(`Failed to remove role from user: ${(error as Error).message}`);
        }
    }

    //Log to discord
    if (txConfig.discordBot.wagerRevokeLogChannel) {
        await sendWagerBlacklistLog(txConfig.discordBot.wagerRevokeLogChannel, adminName, user, reason, true);
    }

    //Log to admin log
    logDiscordAdminAction(adminName, `Revoked wager blacklist for ${user.user.tag} with reason: ${reason}`);

    //Reply to interaction
    return await interaction.reply(embedder.success(`Wager blacklist revoked for ${user.user.tag}.`));
}
