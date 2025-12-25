const modulename = 'WebServer:PlayerPcCheck';
import { txHostConfig } from '@core/globalData';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { GenericApiResp } from '@shared/genericApiTypes';
import consoleFactory from '@lib/console';
import { anyUndefined } from '@lib/misc';
import playerResolver from '@lib/player/playerResolver';
import { PlayerClass } from '@lib/player/playerClasses';
import { formidable } from 'formidable';
import path from 'path';
import { sendPcReportLog } from '@modules/DiscordBot/discordHelpers';
import fs from 'fs-extra';

const console = consoleFactory(modulename);

/**
 * Handle PC Check
 */
export default async function PlayerPcCheck(ctx: AuthedCtx) {
    const formOptions: formidable.Options = {};
    if (txHostConfig.dataPath) {
        formOptions.uploadDir = path.join(txHostConfig.dataPath, 'proofs');
        console.verbose.dir({ uploadDir: formOptions.uploadDir });
        formOptions.keepExtensions = true;
        formOptions.maxFileSize = 3 * 1024 * 1024;
        formOptions.maxFiles = 3;
        formOptions.filter = ({ mimetype }) => mimetype && mimetype.includes('image');
    }

    let fields, files;
    try {
        const form = formidable(formOptions);
        [fields, files] = await form.parse(ctx.req);
    } catch (error) {
        return ctx.send({ error: `Failed to parse form: ${(error as Error).message}` });
    }

    //Sanity check
    if (anyUndefined(
        fields.caught,
        fields.supervisor,
        fields.approver,
    )) {
        return ctx.send({ error: 'Invalid request.' });
    }

    const caught = fields.caught[0];
    const supervisor = fields.supervisor[0];
    const approver = fields.approver[0];
    const reason = fields.reason?.[0];
    const proofs = (files.proofs && Array.isArray(files.proofs))
        ? files.proofs.map(f => f.newFilename)
        : (files.proofs ? [files.proofs.newFilename] : []);
    console.verbose.dir({ proofs });

    //Finding the player
    let player;
    try {
        const { mutex, netid, license } = ctx.query;
        player = playerResolver(mutex, parseInt((netid as string)), license);
    } catch (error) {
        return ctx.send({ error: (error as Error).message });
    }

    //Check permissions
    if (!ctx.admin.testPermission('web.pc_checker', modulename)) {
        return ctx.send({ error: 'You do not have permission to execute this action.' });
    }

    //Validating server & player
    const allIds = player.getAllIdentifiers();
    if (!allIds.length) {
        return ctx.send({ error: 'Cannot create a PC Check for a player with no identifiers.' });
    }

    //Register action
    try {
        const actionId = txCore.database.actions.registerPcCheck(
            allIds,
            ctx.admin.name,
            reason,
            caught === 'true',
            supervisor,
            approver,
            proofs,
            player.displayName
        );
        ctx.admin.logAction(`Created PC Check for player "${player.displayName}".`);

        //Send discord log
        if (txConfig.discordBot.pcReportLogChannel) {
            try {
                const discordId = allIds.find(id => typeof id === 'string' && id.startsWith('discord:'));
                if (discordId) {
                    const uid = discordId.substring(8);
                    const member = await txCore.discordBot.guild?.members.fetch(uid);
                    if (member) {
                        sendPcReportLog(
                            txConfig.discordBot.pcReportLogChannel,
                            ctx.admin.name,
                            member,
                            supervisor,
                            approver,
                            caught === 'true',
                            proofs,
                        );
                    }
                }
            } catch (error) {
                //Don't fail the whole command if the role removal fails
                console.error(`Failed to send PC report log: ${(error as Error).message}`);
            }
        }

        return ctx.send({ success: true, actionId });
    } catch (error) {
        return ctx.send({ error: `Failed to create PC Check: ${(error as Error).message}` });
    }
}
