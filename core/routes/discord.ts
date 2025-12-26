const modulename = 'WebServer:Discord';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/**
 * Returns the discord roles
 */
export default async function GetDiscordRoles(ctx: AuthedCtx) {
    if (!txCore.discordBot.isClientReady) {
        return ctx.send({
            error: 'Discord bot is not connected.'
        });
    }

    try {
        const roles = await txCore.discordBot.guild.roles.fetch();
        const simplifiedRoles = roles.map(role => ({
            id: role.id,
            name: role.name,
        }));
        return ctx.send(simplifiedRoles);
    } catch (error) {
        return ctx.send({
            error: `Failed to fetch roles: ${(error as Error).message}`
        });
    }
};
