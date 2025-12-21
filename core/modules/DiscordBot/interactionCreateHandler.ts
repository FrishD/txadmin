const modulename = 'DiscordBot:interactionHandler';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, GuildMember, Interaction, InteractionType } from 'discord.js';
import humanizeDuration from 'humanize-duration';
import infoCommandHandler from './commands/info';
import statusCommandHandler from './commands/status';
import whitelistCommandHandler from './commands/whitelist';
import { embedder, embedColors } from './discordHelpers';
import { cloneDeep } from 'lodash-es'; //DEBUG
import consoleFactory from '@lib/console';

const console = consoleFactory(modulename);

// Extend the discord config interface
interface ExtendedDiscordConfig {
    panelLoginChannel?: string;
    revokeApprovalChannel?: string;
    adminPermsChannel?: string;
    revokeApprovalRole?: string;
}

// Extend global txCore type
declare global {
    var txCore: {
        adminStore: {
            getAdminByProviderUID(uid: string): any;
            registeredPermissions: Record<string, string>;
        };
        logger: {
            admin: {
                write(adminName: string, message: string): void;
            };
        };
        discordBot: {
            client: {
                channels: {
                    cache: {
                        get(id: string): any;
                    };
                };
            };
        };
        discordConfig: ExtendedDiscordConfig;
        database: {
            actions: {
                approveRevoke(actionId: string, author: string, types: string[]): void;
                denyRevoke(actionId: string, author: string): void;
            };
        };
        metrics: {
            txRuntime: {
                botCommands: {
                    count(commandName: string): void;
                };
            };
        };
    };
}

//All commands
const handlers = {
    status: statusCommandHandler,
    whitelist: whitelistCommandHandler,
    info: infoCommandHandler,
}

const noHandlerResponse = async (interaction: Interaction) => {
    if (interaction.isRepliable()) {
        const identifier = (interaction as any)?.commandName ?? (interaction as any)?.customId ?? 'unknown';
        await interaction.reply({
            content: `No handler available for this interaction (${InteractionType[interaction.type]} > ${identifier})`,
            ephemeral: true,
        });
    }
}

export default async (interaction: Interaction) => {
    //DEBUG
    // const copy = Object.assign(cloneDeep(interaction), { user: false, member: false });
    // console.dir(copy);
    // return;

    //Handler filter
    if (interaction.user.bot) return;

    //Process buttons
    if (interaction.isButton()) {
        const [action, actionId] = interaction.customId.split(':');

        if (action === 'revoke_approve' || action === 'revoke_deny') {
            const isApprove = action === 'revoke_approve';
            const modal = new ModalBuilder()
                .setCustomId(`revoke_modal:${isApprove ? 'approve' : 'deny'}:${actionId}`)
                .setTitle(isApprove ? 'Approve Revocation' : 'Deny Revocation');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel("Reason:")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder(isApprove ? 'Reason for approving this revocation...' : 'Reason for denying this revocation...')
                .setRequired(true);

            const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }
    }

    //Process Modals
    if (interaction.isModalSubmit()) {
        const [modalType, action, actionId] = interaction.customId.split(':');

        if (modalType === 'revoke_modal' && (action === 'approve' || action === 'deny')) {
            const revokeApprovalRole = txCore.discordConfig.revokeApprovalRole || "1113574262364712970";
            if (!revokeApprovalRole) {
                return await interaction.reply(embedder.danger('Revoke approval role not configured.', true));
            }

            if (!(interaction.member instanceof GuildMember)) {
                return await interaction.reply(embedder.danger('Could not retrieve your member data.', true));
            }

            if (!interaction.member.roles.cache.has(revokeApprovalRole)) {
                return await interaction.reply(embedder.danger('You do not have the required role to approve/deny this request.', true));
            }

            const originalMessage = interaction.message;
            if (!originalMessage) {
                return await interaction.reply(embedder.danger('Could not find original message.', true));
            }
            const originalEmbed = originalMessage.embeds[0];
            if (!originalEmbed) {
                return await interaction.reply(embedder.danger('Could not find original embed.', true));
            }

            try {
                const reason = interaction.fields.getTextInputValue('reason');
                if (action === 'approve') {
                    txCore.database.actions.approveRevoke(actionId, interaction.user.tag, ['ban'], reason);
                    const newEmbed = new EmbedBuilder(originalEmbed.toJSON())
                        .setTitle('Request Approved')
                        .setColor(embedColors.success)
                        .setAuthor({
                            name: `Approved by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL(),
                        });
                    await originalMessage.edit({ embeds: [newEmbed], components: [] });
                    return await interaction.reply(embedder.success('Revoke approved.', true));

                } else { //deny
                    txCore.database.actions.denyRevoke(actionId, interaction.user.tag, reason);
                    const newEmbed = new EmbedBuilder(originalEmbed.toJSON())
                        .setTitle('Request Denied')
                        .setColor(embedColors.danger)
                        .setAuthor({
                            name: `Denied by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL(),
                        });
                    await originalMessage.edit({ embeds: [newEmbed], components: [] });
                    return await interaction.reply(embedder.warning('Revoke denied.', true));
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return await interaction.reply(embedder.danger(`Failed to perform action: ${errorMessage}`, true));
            }
        }
    }

    //Process Slash commands
    if (interaction.isChatInputCommand()) {
        //Get interaction
        const handler = handlers[interaction.commandName as keyof typeof handlers];
        if (!handler) {
            noHandlerResponse(interaction).catch((e) => {});
            return;
        }
        txCore.metrics.txRuntime.botCommands.count(interaction.commandName);

        //Executes interaction
        try {
            await handler(interaction);
            return;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const msg = `Error executing ${interaction.commandName}: ${errorMessage}`;
            console.error(msg);
            await interaction.reply(embedder.danger(msg, true));
            return ;
        }
    }

    //Unknown type
    noHandlerResponse(interaction).catch((e) => {});
};