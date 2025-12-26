import { z } from "zod";
import { discordSnowflakeSchema, typeDefinedConfig, typeNullableConfig } from "./utils";
import { defaultEmbedConfigJson, defaultEmbedJson } from "@modules/DiscordBot/defaultJsons";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";


const enabled = typeDefinedConfig({
    name: 'Bot Enabled',
    default: false,
    validator: z.boolean(),
    fixer: SYM_FIXER_DEFAULT,
});

const token = typeNullableConfig({
    name: 'Bot Token',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const guild = typeNullableConfig({
    name: 'Server ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const warningsChannel = typeNullableConfig({
    name: 'Warnings Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const revokeApprovalRole = typeNullableConfig({
    name: 'Revoke Approval Role ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const adminPermsChannel = typeNullableConfig({
    name: 'Admin Perms Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const revokeApprovalChannel = typeNullableConfig({
    name: 'Revoke Approval Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const panelLoginChannel = typeNullableConfig({
    name: 'Panel Login Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});


//We are not validating the JSON, only that it is a string
export const attemptMinifyJsonString = (input: string) => {
    try {
        return JSON.stringify(JSON.parse(input));
    } catch (error) {
        return input;
    }
};

const embedJson = typeDefinedConfig({
    name: 'Status Embed JSON',
    default: defaultEmbedJson,
    validator: z.string().min(1).transform(attemptMinifyJsonString),
    //NOTE: no true valiation in here, done in the module only
    fixer: SYM_FIXER_DEFAULT,
});

const embedConfigJson = typeDefinedConfig({
    name: 'Status Config JSON',
    default: defaultEmbedConfigJson,
    validator: z.string().min(1).transform(attemptMinifyJsonString),
    //NOTE: no true valiation in here, done in the module only
    fixer: SYM_FIXER_DEFAULT,
});

const wagerBlacklistRole = typeNullableConfig({
    name: 'Wager Blacklist Role ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const wagerBlacklistLogChannel = typeNullableConfig({
    name: 'Wager Blacklist Log Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const wagerRevokeLogChannel = typeNullableConfig({
    name: 'Wager Revoke Log Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const blacklistRole = typeNullableConfig({
    name: 'Blacklist Role ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const complementaryRole = typeNullableConfig({
    name: 'Complementary Role ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});


const rateLimitLogChannel = typeNullableConfig({
    name: 'Rate Limit Log Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const playerSearchLogChannel = typeNullableConfig({
    name: 'Player Search Log Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const historySearchLogChannel = typeNullableConfig({
    name: 'History Search Log Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const pcCheckLogChannel = typeNullableConfig({
    name: 'PC Check Log Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const pcReportLogChannel = typeNullableConfig({
    name: 'PC Report Log Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const pcTargetChannelId = typeNullableConfig({
    name: 'PC Target Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});


export default {
    enabled,
    token,
    guild,
    warningsChannel,
    revokeApprovalChannel,
    revokeApprovalRole,
    adminPermsChannel,
    panelLoginChannel,
    wagerBlacklistRole,
    wagerBlacklistLogChannel,
    wagerRevokeLogChannel,
    blacklistRole,
    complementaryRole,
    rateLimitLogChannel,
    playerSearchLogChannel,
    historySearchLogChannel,
    pcCheckLogChannel,
    pcReportLogChannel,
    pcTargetChannelId,
    embedJson,
    embedConfigJson,
} as const;
