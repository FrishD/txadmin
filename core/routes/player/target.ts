import { AuthedCtx } from "@lib/utils/httpTypes";
import { Path, POST } from "fets";
import { z } from "zod";
import { guardAdmin, guardPermission } from "@lib/utils/httpAuth";
import { DatabasePlayerType } from "@modules/Database/databaseTypes";

const bodySchema = z.object({
    license: z.string().regex(/^[0-9a-f]{40}$/),
});

export default (ctx: AuthedCtx) => {
    return async (req: any, res: any) => {
        const {
            admin,
            authedPlayer,
        } = guardAdmin(ctx, req, res);

        // Check for permissions
        const requiredPermission = "players.manage";
        if (!authedPlayer.permissions.includes(requiredPermission)) {
            return res.status(403).send({ error: "You don't have permission to do this." });
        }

        const { license } = await bodySchema.parseAsync(req.body);

        try {
            const updatedPlayer = txCore.db.players.togglePlayerTarget(license, admin.name);
            return res.send(updatedPlayer);
        } catch (error) {
            console.error(`Failed to toggle player target: ${(error as Error).message}`);
            return res.status(500).send({ error: "Failed to toggle player target." });
        }
    };
};
