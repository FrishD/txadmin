import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { txEnv } from '@core/globalData';
import path from 'node:path';
import fse from 'fs-extra';
import { z } from 'zod';

const schema = z.object({
    filename: z.string().regex(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/),
});

export default async function Proofs(ctx: AuthedCtx) {
    const params = schema.safeParse(ctx.params);
    if (!params.success) {
        return ctx.utils.error(400, 'Invalid filename.');
    }
    const { filename } = params.data;

    if (!ctx.admin.testPermission('web.pc_checker', 'Proofs') && !ctx.admin.testPermission('web.admin', 'Proofs')) {
        return ctx.utils.error(403, 'You don\'t have permission to view this page.');
    }

    const proofsDir = path.join(txEnv.dataPath, 'proofs');
    const filePath = path.join(proofsDir, filename);

    try {
        const stats = await fse.stat(filePath);
        if (!stats.isFile()) {
            return ctx.utils.error(404, 'File not found.');
        }
        ctx.body = fse.createReadStream(filePath);
        ctx.type = path.extname(filename);
    } catch (error) {
        return ctx.utils.error(404, 'File not found.');
    }
}
