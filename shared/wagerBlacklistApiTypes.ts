import { DatabaseActionBaseType } from "@core/modules/Database/databaseTypes";
import { GenericApiErrorResp } from "./genericApiTypes";

export type WagerBlacklistActionType = {
    type: 'wagerblacklist';
    expiration: false;
} & DatabaseActionBaseType;

export type WagerBlacklistTableResp = WagerBlacklistActionType[] | GenericApiErrorResp;

export type WagerBlacklistStatsResp = {
    total: number;
    active: number;
    revoked: number;
    last7days: number;
} | GenericApiErrorResp;
