const modulename = 'DiscordBot:cmd:wagerblacklist';
import { CommandInteraction, GuildMember } from 'discord.js';
import { embedder, ensurePermission, logDiscordAdminAction, sendWagerBlacklistLog } from '../discordHelpers';
import consoleFactory from '@lib/console';


export default async (interaction: CommandInteraction) => {
    //Check permissions
    const adminName = await ensurePermission(interaction, 'wager.staff');
    if (typeof adminName !== 'string') return;

    //Get options
    const user = interaction.options.get('user')?.member as GuildMember;
    const reason = interaction.options.get('reason')?.value as string;

    if (!user || !reason) {
        return await interaction.reply(embedder.danger('Invalid arguments.'));
    }

    //Register action
    const identifiers = [`discord:${user.id}`];
    try {
        txCore.database.actions.registerWagerBlacklist(
            identifiers,
            adminName,
            reason,
            user.displayName
        );
    } catch (error) {
        return await interaction.reply(embedder.danger(`Failed to register wager blacklist: ${(error as Error).message}`));
    }

    //Add role
    if (txConfig.discordBot.wagerBlacklistRole) {
        try {
            await user.roles.add(txConfig.discordBot.wagerBlacklistRole);
        } catch (error) {
            return await interaction.reply(embedder.danger(`Failed to add role to user: ${(error as Error).message}`));
        }
    }

    //Log to discord
    if (txConfig.discordBot.wagerBlacklistLogChannel) {
        await sendWagerBlacklistLog(txConfig.discordBot.wagerBlacklistLogChannel, adminName, user, reason);
    }

    //Log to admin log
    logDiscordAdminAction(adminName, `Added wager blacklist for ${user.user.tag} with reason: ${reason}`);

    //Reply to interaction
    return await interaction.reply(embedder.success(`Wager blacklist added for ${user.user.tag}.`));
}
