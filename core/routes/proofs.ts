const modulename = 'WebServer:Proofs';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { txEnv } from '@txAdmin/txAdmin';
import path from 'path';
import fs from 'fs-extra';
const console = consoleFactory(modulename);

/**
 * Serves a proof file
 */
export default async function GetProofs(ctx: AuthedCtx) {
    //Sanity check
    if (typeof ctx.params.fileName !== 'string' || !ctx.params.fileName.length) {
        return ctx.utils.error(400, 'Invalid Request');
    }

    //Check permissions
    if (!ctx.admin.testPermission('players.ban', modulename)) {
        return ctx.send({
            error: 'You don\'t have permission to execute this action.',
        });
    }

    const proofsPath = path.join(txEnv.dataPath, 'proofs');
    const filePath = path.join(proofsPath, ctx.params.fileName);

    try {
        if (!await fs.pathExists(filePath)) {
            return ctx.utils.error(404, 'File not found');
        }
        ctx.body = await fs.createReadStream(filePath);
    } catch (error) {
        return ctx.utils.error(500, `Failed to serve proof: ${(error as Error).message}`);
    }
}
