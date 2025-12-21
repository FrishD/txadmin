import { DatabaseActionType } from "@modules/Database/databaseTypes";
import { GenericApiErrorResp } from "./genericApiTypes";

export type HistoryStatsResp = {
    totalWarns: number;
    warnsLast7d: number;
    totalBans: number;
    bansLast7d: number;
    totalWagerBlacklists: number;
    groupedByAdmins: {
        name: string;
        actions: number;
    }[];
} | GenericApiErrorResp;


export type HistoryTableSearchType = {
    value: string;
    type: string;
}

export type HistoryTableSortingType = {
    key: 'timestamp';
    desc: boolean;
};

export type HistoryTableReqType = {
    search: HistoryTableSearchType;
    filterbyType: string | undefined;
    filterbyAdmin: string | undefined;
    sorting: HistoryTableSortingType;
    //NOTE: the query needs to be offset.param inclusive, but offset.actionId exclusive
    // therefore, optimistically always limit to x + 1
    offset?: {
        param: number;
        actionId: string;
    }
};

export type HistoryTableActionRevocationType = {
    status: 'not_revoked' | 'pending' | 'approved' | 'denied';
    timestamp: number | null;
    author: string | null;
    requestor?: string | null;
    approver?: string | null;
};

export type HistoryTableActionType = {
    id: string;
    type: "ban" | "warn" | "wagerblacklist" | "mute" | "pccheck";
    playerName: string | false;
    author: string;
    reason: string;
    timestamp: number;
    revocation: HistoryTableActionRevocationType;
    banExpiration?: 'expired' | 'active' | 'permanent';
    warnAcked?: boolean;

    //pccheck only
    caught?: boolean;
    supervisor?: string;
    approver?: string;
    proofs?: string[];

    //ban only
    linkedPcCheckId?: string;
}

export type HistoryTableSearchResp = {
    history: HistoryTableActionType[];
    hasReachedEnd: boolean;
} | GenericApiErrorResp;


export type HistoryActionModalSuccess = {
    serverTime: number; //required to calculate if bans have expired on frontend
    action: DatabaseActionType;
}
export type HistoryActionModalResp = HistoryActionModalSuccess | GenericApiErrorResp;
