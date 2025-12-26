export type DatabasePlayerType = {
    license: string;
    ids: string[];
    hwids: string[];
    displayName: string;
    pureName: string;
    playTime: number;
    tsLastConnection: number;
    tsJoined: number;
    tsWhitelisted?: number;
    notes?: {
        text: string;
        lastAdmin: string | null;
        tsLastEdit: number | null;
    };
    isTargeted?: boolean;
    targetedBy?: string;
};

export type DatabaseActionBaseType = {
    id: string;
    ids: string[];
    playerName: string | false;
    reason: string;
    author: string;
    timestamp: number;
    //FIXME: the revocation object itself should be optional instead of nullable properties
    //BUT DO REMEMBER THE `'XXX' IN YYY` ISSUE!
    revocation: {
        timestamp: number | null;
        approver: string | null;
        requestor?: string | null;
        status?: 'approved' | 'denied' | 'pending' | null;
        reason?: string | null;
    };
};
export type DatabaseActionBanType = {
    type: 'ban';
    hwids?: string[];
    expiration: number | false;
    banApprover?: string;
    oldReason?: string;
    blacklist?: boolean;
    pcCheckId?: string;
} & DatabaseActionBaseType;
export type DatabaseActionWarnType = {
    type: 'warn';
    expiration: false; //FIXME: remove - BUT DO REMEMBER THE `'XXX' IN YYY` ISSUE!
    acked: boolean; //if the player has acknowledged the warning
} & DatabaseActionBaseType;

export type DatabaseActionWagerBlacklistType = {
    type: 'wagerblacklist';
    expiration: false;
} & DatabaseActionBaseType;

export type DatabaseActionMuteType = {
    type: 'mute';
    expiration: number | false;
} & DatabaseActionBaseType;

export type DatabaseActionPcCheckType = {
    type: 'pc_check';
    expiration: false;
    caught: boolean;
    supervisor: string;
    approver: string;
    proofs: string[];
    banId?: string;
} & DatabaseActionBaseType;

export type DatabaseActionSummonType = Omit<DatabaseActionBaseType, 'reason'> & {
    type: 'summon';
    expiration: false;
};

export type DatabaseActionType = DatabaseActionBanType | DatabaseActionWarnType | DatabaseActionWagerBlacklistType | DatabaseActionMuteType | DatabaseActionPcCheckType | DatabaseActionSummonType;

export type DatabaseWhitelistApprovalsType = {
    identifier: string;
    playerName: string; //always filled, even with `unknown` or license `xxxxxx...xxxxxx` 
    playerAvatar: string | null,
    tsApproved: number,
    approvedBy: string
};

export type DatabaseWhitelistRequestsType = {
    id: string, //R####
    license: string,
    playerDisplayName: string,
    playerPureName: string,
    discordTag?: string,
    discordAvatar?: string, //first try to get from GuildMember, then client.users.fetch()
    tsLastAttempt: number,
};

export type DatabaseDataType = {
    version: number,
    players: DatabasePlayerType[],
    actions: DatabaseActionType[],
    whitelistApprovals: DatabaseWhitelistApprovalsType[],
    whitelistRequests: DatabaseWhitelistRequestsType[],
};
