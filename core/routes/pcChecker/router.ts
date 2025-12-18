import { AuthedCtx } from '@core/components/WebServer/ctxTypes';
import Router from '@koa/router';
import { ensurePermission } from '@core/components/WebServer/authLogic';
import { z } from 'zod';
import playerResolver, { getAltPlayers } from '@lib/player/playerResolver';
import { sendPCReportDeletionLog } from '@modules/DiscordBot/discordHelpers';
import { PlayerClass, ServerPlayer } from '@lib/player/playerClasses';
import multer from '@koa/multer';
import { proofsDir } from '@core/extras/helpers';

const router = new Router();
const upload = multer({ dest: proofsDir });

const summonBodySchema = z.object({
    netid: z.number(),
});

router.post('/summon', async (ctx: AuthedCtx) => {
    ensurePermission(ctx, 'players.pc_checker');

    const schemaRes = summonBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const { netid } = schemaRes.data;

    let player;
    try {
        player = playerResolver(null, netid, null);
    } catch (error) {
        return ctx.send({ error: (error as Error).message });
    }

    if (!(player instanceof ServerPlayer) || !player.isConnected) {
        return ctx.send({ error: 'This player is not connected to the server.' });
    }

    txCore.fxRunner.sendEvent('txAdmin:events:summonPlayer', {
        target: player.netid,
        author: ctx.admin.name,
    });

    return ctx.send({ success: true });
});

const reportBodySchema = z.object({
    playerLicense: z.string(),
    supervisor: z.string(),
    result: z.enum(['passed', 'not passed']),
    explanation: z.string(),
});

router.post('/report', upload.single('proofImage'), async (ctx: AuthedCtx) => {
    ensurePermission(ctx, 'players.pc_checker');

    const schemaRes = reportBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const { playerLicense, supervisor, result, explanation } = schemaRes.data;
    const proofImage = (ctx.request.files as any)?.proofImage;

    if (!proofImage) {
        return ctx.utils.error(400, 'Missing proof image.');
    }

    try {
        const reportId = txCore.database.actions.registerPCReport({
            reporter: ctx.admin.name,
            supervisor,
            result,
            explanation,
            proofImage: proofImage.path,
            playerLicense,
        });

        if (result === 'not passed') {
            const recentBans = txCore.database.actions.findMany(
                [playerLicense],
                undefined,
                { type: 'ban', expiration: false, 'revocation.timestamp': null }
            );
            const recentBan = recentBans.find(ban => ban.timestamp > Date.now() / 1000 - 3600);
            if (recentBan) {
                txCore.database.actions.linkPCReportToBan(reportId, recentBan.id);
            }
        }

        return ctx.send({ success: true });
    } catch (error) {
        return ctx.send({ error: `Failed to save report: ${(error as Error).message}` });
    }
});

export default router;

const playerDataType = z.object({
    license: z.string(),
});

router.get('/player', async (ctx: AuthedCtx) => {
    ensurePermission(ctx, 'players.pc_checker');

    const schemaRes = playerDataType.safeParse(ctx.query);
    if (!schemaRes.success) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const { license } = schemaRes.data;

    let player;
    try {
        player = playerResolver(null, null, license);
    } catch (error) {
        return ctx.send({ error: (error as Error).message });
    }

    const alts = getAltPlayers(player.hwids);
    const playerData = {
        displayName: player.displayName,
        license: player.license,
        alts: alts.map(alt => ({
            displayName: alt.displayName,
            license: alt.license,
        })),
    };

    return ctx.send(playerData);
});

router.get('/reports', async (ctx: AuthedCtx) => {
    ensurePermission(ctx, 'players.pc_checker');
    const reports = txCore.database.getDboRef().data.pcReports;
    return ctx.send(reports);
});

const deleteReportBodySchema = z.object({
    reportId: z.string(),
});

router.post('/delete_report', async (ctx: AuthedCtx) => {
    ensurePermission(ctx, 'pc.manager');

    const schemaRes = deleteReportBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const { reportId } = schemaRes.data;

    try {
        txCore.database.actions.deletePCReport(reportId);
        sendPCReportDeletionLog(ctx.admin.name, reportId);
        return ctx.send({ success: true });
    } catch (error) {
        return ctx.send({ error: `Failed to delete report: ${(error as Error).message}` });
    }
});
