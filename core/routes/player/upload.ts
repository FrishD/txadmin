const modulename = 'WebServer:PlayerUpload';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { txEnv } from '@core/globalData';
import path from 'node:path';
import fse from 'fs-extra';
import multer from 'multer';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const proofsDir = path.join(txEnv.dataPath, 'proofs');
        fse.ensureDirSync(proofsDir);
        cb(null, proofsDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        cb(null, `${nanoid()}${extension}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
    },
});

export default async function PlayerUpload(ctx: AuthedCtx) {
    if (!ctx.admin.testPermission('players.ban', modulename)) {
        return ctx.utils.error(403, 'You don\'t have permission to execute this action.');
    }

    const uploader = upload.single('proof');
    await new Promise<void>((resolve, reject) => {
        uploader(ctx.req, ctx.res, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });

    if (!ctx.req.file) {
        return ctx.utils.error(400, 'No file uploaded.');
    }

    ctx.send({
        success: true,
        filename: ctx.req.file.filename,
    });
}
