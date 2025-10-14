const modulename = 'DiscordBot:cmd';
import orderedEmojis from 'unicode-emoji-json/data-ordered-emoji';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, CommandInteraction, EmbedBuilder, InteractionReplyOptions } from "discord.js";
import consoleFactory from '@lib/console';
import { got } from "got";
import humanizeDuration from 'humanize-duration';
import type { Admin } from "@modules/AdminStore/Admin";
import type { DatabaseActionType } from "@modules/Database/databaseTypes";

const console = consoleFactory(modulename);
const allEmojis = new Set(orderedEmojis);

// Discord configuration constants
export const revokeApprovalRole = "1113574262364712970";
export const adminPermsChannel = "1423672462167511250";
export const revokeApprovalChannel = "1423672518375641148";
export const panelLoginChannel = "1423923548564754522";

// Define interface for discord bot configuration
export interface DiscordConfig {
    panelLoginChannel?: string;
    revokeApprovalChannel?: string;
    adminPermsChannel?: string;
}

// Type assertion for txCore - extending the existing global type
declare global {
    var txCore: txCore & {
        adminStore: {
            getAdminByProviderUID(uid: string): Admin | undefined;
            registeredPermissions: Record<string, string>;
            admins: Admin[];
        };
        logger: {
            admin: {
                write(adminName: string, message: string): void;
            };
        };
        discordBot: {
            client?: {
                channels: {
                    cache: {
                        get(id: string): any;
                    };
                };
            };
            isClientReady: boolean;
        };
        discordConfig: DiscordConfig;
    };
}

/**
 * Generic embed generation functions
 */
const genericEmbed = (
    msg: string,
    ephemeral = false,
    color: ColorResolvable | null = null,
    emoji?: string
): InteractionReplyOptions => {
    return {
        ephemeral,
        embeds: [new EmbedBuilder({
            description: emoji ? `:${emoji}: ${msg}` : msg,
        }).setColor(color)],
    }
}

/**
 * Returns a ready-to-use discord client instance, or throws an error if not available.
 */
export const getDiscordBot = () => {
    if (!txCore.discordBot || !txCore.discordBot.isClientReady || !txCore.discordBot.client) {
        throw new Error('Discord bot is not available.');
    }
    return txCore.discordBot.client;
}

export const embedColors = {
    info: 0x1D76C9,
    success: 0x0BA70B,
    warning: 0xFFF100,
    danger: 0xA70B28,
} as const;

export const embedder = {
    generic: genericEmbed,
    info: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.info, 'information_source'),
    success: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.success, 'white_check_mark'),
    warning: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.warning, 'warning'),
    danger: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.danger, 'no_entry_sign'),
}

/**
 * Ensure that the discord interaction author has the required permission
 */
export const ensurePermission = async (interaction: CommandInteraction, reqPerm: string) => {
    const admin = txCore.adminStore.getAdminByProviderUID(interaction.user.id);
    if (!admin) {
        await interaction.reply(
            embedder.warning(`**Your account does not have txAdmin access.** :face_with_monocle:\nIf you are already registered in txAdmin, visit the Admin Manager page, and make sure the Discord ID for your user is set to \`${interaction.user.id}\`.`, true)
        );
        return false;
    }
    if (
        admin.master !== true
        && !admin.permissions.includes('all_permissions')
        && !admin.permissions.includes(reqPerm)
    ) {
        const permName = (txCore.adminStore.registeredPermissions as Record<string, string>)[reqPerm] ?? 'Unknown';
        await interaction.reply(
            embedder.danger(`Your txAdmin account does not have the "${permName}" permissions required for this action.`, true)
        );
        return false;
    }

    return admin.name;
}

/**
 * Equivalent to ctx.admin.logAction()
 */
export const logDiscordAdminAction = async (adminName:string, message: string) => {
    txCore.logger.admin.write(adminName, message);
}


/**
 * Returns a discord mention string for an admin, or their name if they don't have a discord id.
 */
export const getAdminMention = (admin: Admin) => {
    if (admin.providers?.discord?.id) {
        return `<@${admin.providers.discord.id}>`;
    } else {
        return admin.name;
    }
}

/**
 * Sends a login attempt log to the configured discord channel
 */
export const sendLoginAttempt = async (
    username: string,
    ip: string,
    userAgent: string | undefined,
    success: boolean
) => {
    // Check if Discord bot is available
    if (!txCore.discordBot || !txCore.discordBot.isClientReady || !txCore.discordBot.client) {
        console.warn('Discord bot is not available for sending login attempt log');
        return;
    }

    const channelId = txCore.discordConfig.panelLoginChannel || panelLoginChannel;
    if (typeof channelId !== 'string' || !channelId.length) {
        return;
    }

    //Get channel
    const channel = txCore.discordBot.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        console.warn(`The configured panelLoginChannel '${channelId}' is not a valid text channel.`);
        return;
    }

    //Get location
    let location = 'Unknown';
    try {
        const url = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city`;
        const data = await got(url).json() as any;
        if (data.status !== 'success') {
            location = data.message ?? 'Failed to retrieve';
        } else {
            location = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
        }
    } catch (error) {
        location = `Error: ${(error as Error).message}`;
    }

    //Prepare embed
    const embed = new EmbedBuilder({
        title: `Panel Login ${success ? 'Success' : 'Failure'}`,
        timestamp: new Date(),
        color: success ? embedColors.success : embedColors.danger,
        fields: [
            { name: 'Username', value: username, inline: true },
            { name: 'IP Address', value: ip, inline: true },
            { name: 'Location', value: location, inline: false },
            { name: 'User-Agent', value: `\`\`\`${userAgent ?? 'N/A'}\`\`\``, inline: false },
        ]
    });

    //Send message
    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to send login log to discord channel with error: ${(error as Error).message}`);
    }
}

/**
 * Tests if an embed url is valid or not
 */
export const isValidEmbedUrl = (url: unknown) => {
    return typeof url === 'string' && /^(https?|discord):\/\//.test(url);
}

/**
 * Send revoke approval request to discord channel
 */
export const sendRevokeApproval = async (
    action: DatabaseActionType,
    requestor: Admin,
) => {
    // Check if Discord bot is available
    if (!txCore.discordBot || !txCore.discordBot.isClientReady || !txCore.discordBot.client) {
        throw new Error('Discord bot is not available.');
    }

    const channelId = txCore.discordConfig.revokeApprovalChannel || revokeApprovalChannel;
    if (typeof channelId !== 'string' || !channelId.length) {
        throw new Error("Revoke approval channel not configured or is invalid.");
    }

    //Get channel
    const channel = txCore.discordBot.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        throw new Error(`The configured revokeApprovalChannel '${channelId}' is not a valid text channel.`);
    }

    //Prepare embed
    const requestorMention = getAdminMention(requestor);
    const banAuthorAdmin = txCore.adminStore.admins.find(a => a.name === action.author);
    const banAuthorMention = banAuthorAdmin ? getAdminMention(banAuthorAdmin) : action.author;
    let banDuration: string;
    if(action.expiration === false){
        banDuration = 'Permanent';
    } else {
        banDuration = humanizeDuration(action.expiration - action.timestamp, { round: true });
    }

    const embed = new EmbedBuilder({
        color: embedColors.warning,
        title: 'Ban Revocation Request',
        description: `**Player:** ${action.playerName || 'identifiers'}\n**Original Ban Reason:** ${action.reason || 'no reason'}`,
    })
        .setAuthor({ name: `Requested by ${requestor.name}` })
        .addFields(
            { name: 'Revocation Reason', value: action.revocation.reason || 'no reason provided', inline: false },
            { name: 'Original Ban Duration', value: banDuration, inline: true },
            { name: 'Originally Banned by', value: banAuthorMention, inline: true },
        )
        .setFooter({ text: `Action ID: ${action.id}` })
        .setTimestamp();

    if (txConfig.general.serverIcon) {
        embed.setThumbnail(txConfig.general.serverIcon);
    }

    //Prepare buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`revoke_approve:${action.id}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId(`revoke_deny:${action.id}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌'),
    );

    //Send message
    try {
        await channel.send({ embeds: [embed], components: [buttons] });
    } catch (error) {
        throw new Error(`Failed to send revoke approval to discord channel with error: ${(error as Error).message}`);
    }
}

export const sendPermissionChange = async (
    targetAdmin: Admin,
    sourceAdmin: Admin,
    permsBefore: string[],
    permsAfter: string[]
) => {
    // Check if Discord bot is available
    if (!txCore.discordBot || !txCore.discordBot.isClientReady || !txCore.discordBot.client) {
        console.warn('Discord bot is not available for sending permission change log');
        return;
    }

    const channelId = txCore.discordConfig.adminPermsChannel || adminPermsChannel;
    if (!channelId) return;

    //Get channel
    const channel = txCore.discordBot.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        console.warn(`The configured adminPermsChannel '${channelId}' is not a valid text channel.`);
        return;
    }

    //Calculate diff
    const added = permsAfter.filter(p => !permsBefore.includes(p));
    const removed = permsBefore.filter(p => !permsAfter.includes(p));
    if (!added.length && !removed.length) {
        return; //No changes to log
    }

    //Prepare embed
    const targetMention = getAdminMention(targetAdmin);
    const sourceMention = getAdminMention(sourceAdmin);

    const embed = new EmbedBuilder({
        title: 'Admin Permissions Changed',
        timestamp: new Date(),
        color: embedColors.info,
        fields: [
            { name: 'User', value: targetMention, inline: true },
            { name: 'Changed By', value: sourceMention, inline: true },
        ]
    });
    if (added.length) {
        embed.addFields({ name: '🟢 Added', value: '`' + added.join('`\n`') + '`', inline: false });
    }
    if (removed.length) {
        embed.addFields({ name: '🔴 Removed', value: '`' + removed.join('`\n`') + '`', inline: false });
    }

    //Send message
    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to send permission change log to discord channel with error: ${(error as Error).message}`);
    }
}

export const isValidButtonEmoji = (emoji: unknown) => {
    if (typeof emoji !== 'string') return false;
    if (/^\d{17,19}$/.test(emoji)) return true;
    if (/^<a?:\w{2,32}:\d{17,19}>$/.test(emoji)) return true;
    return allEmojis.has(emoji);
}

/**
 * Send a log of a successful revocation to a discord channel
 */
export const sendRevocationLog = async (action: DatabaseActionType) => {
    // Check if Discord bot is available
    if (!txCore.discordBot || !txCore.discordBot.isClientReady || !txCore.discordBot.client) {
        console.warn('Discord bot is not available for sending revocation log.');
        return;
    }

    const channelId = '1202730523466932245'; // As requested by user

    //Get channel
    const channel = txCore.discordBot.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        console.warn(`The configured revocation log channel '${channelId}' is not a valid text channel.`);
        return;
    }

    //Prepare embed
    const approverAdmin = txCore.adminStore.getAdminByName(action.revocation.approver!);
    const approverMention = approverAdmin ? getAdminMention(approverAdmin) : action.revocation.approver;

    const embed = new EmbedBuilder({
        color: embedColors.success,
        title: `Action Revoked: ${action.type.toUpperCase()}`,
        description: `**Player:** ${action.playerName || 'identifiers'}\n**Original Reason:** ${action.reason || 'no reason'}`,
    })
        .setAuthor({ name: `Revoked by ${action.revocation.approver}` })
        .addFields(
            { name: 'Revocation Reason', value: action.revocation.reason || 'no reason provided', inline: false },
        )
        .setFooter({ text: `Action ID: ${action.id}` })
        .setTimestamp();

    if (txConfig.general.serverIcon) {
        embed.setThumbnail(txConfig.general.serverIcon);
    }

    //Send message
    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to send revocation log to discord channel with error: ${(error as Error).message}`);
    }
}


/**
 * Send a log of a mute action to a discord channel
 */
export const sendMuteLog = async (
    adminName: string,
    targetUser: any,
    reason: string,
    duration: string,
    isUnmute = false
) => {
    const muteChannelId = '1425054873237454898';
    const unmuteChannelId = '1425054882603335730';
    const channelId = isUnmute ? unmuteChannelId : muteChannelId;

    console.log(`Attempting to send mute log to channel ${channelId}`);
    const client = getDiscordBot();

    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        console.warn(`The configured mute log channel '${channelId}' is not a valid text channel.`);
        return;
    }

    const embed = new EmbedBuilder({
        title: isUnmute ? 'Player Unmuted' : 'Player Muted',
        timestamp: new Date(),
        color: isUnmute ? embedColors.success : embedColors.danger,
        fields: [
            { name: 'User', value: targetUser.displayName, inline: true },
            { name: 'Admin', value: adminName, inline: true },
            { name: 'Duration', value: duration, inline: false },
            { name: 'Reason', value: reason, inline: false },
        ]
    });

    try {
        await channel.send({ embeds: [embed] });
        console.log(`Successfully sent mute log to channel ${channelId}`);
    } catch (error) {
        console.error(`Failed to send mute log to discord channel with error: ${(error as Error).message}`);
    }
}


/**
 * Send a log of a wager blacklist action to a discord channel
 */
export const sendWagerBlacklistLog = async (
    channelId: string,
    adminName: string,
    targetUser: any, //GuildMember is not available here
    reason: string,
    isRevoke = false
) => {
    console.log(`Attempting to send wager blacklist log to channel ${channelId}`);
    const client = getDiscordBot();

    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        console.warn(`The configured wager blacklist log channel '${channelId}' is not a valid text channel.`);
        return;
    }

    const embed = new EmbedBuilder({
        title: isRevoke ? 'Wager Blacklist Revoked' : 'Wager Blacklist Added',
        timestamp: new Date(),
        color: isRevoke ? embedColors.success : embedColors.danger,
        fields: [
            { name: 'User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Admin', value: adminName, inline: true },
            { name: 'Reason', value: reason, inline: false },
        ]
    });

    try {
        await channel.send({ embeds: [embed] });
        console.log(`Successfully sent wager blacklist log to channel ${channelId}`);
    } catch (error) {
        console.error(`Failed to send wager blacklist log to discord channel with error: ${(error as Error).message}`);
    }
}