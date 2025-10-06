import { cloneDeep } from 'lodash-es';
import { DbInstance, SavePriority } from "../instance";
import { DatabaseActionBanType, DatabaseActionType, DatabaseActionWarnType, DatabaseActionWagerBlacklistType, DatabaseActionMuteType } from "../databaseTypes";
import { genActionID } from "../dbUtils";
import { now } from '@lib/misc';
import { sendRevocationLog } from '@modules/DiscordBot/discordHelpers';
import consoleFactory from '@lib/console';
const console = consoleFactory('DatabaseDao');


/**
 * Data access object for the database "actions" collection.
 */
export default class ActionsDao {
    constructor(private readonly db: DbInstance) { }

    private get dbo() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj;
    }

    private get chain() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj.chain;
    }


    /**
     * Searches for an action in the database by the id, returns action or null if not found
     */
    findOne(actionId: string): DatabaseActionType | null {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');

        //Performing search
        const a = this.chain.get('actions')
            .find({ id: actionId })
            .cloneDeep()
            .value();
        return (typeof a === 'undefined') ? null : a;
    }


    /**
     * Returns the entire actions array.
     */
    getRaw(): readonly DatabaseActionType[] {
        return this.chain.get('actions').value();
    }


    /**
     * Searches for any registered action in the database by a list of identifiers and optional filters
     * Usage example: findMany(['license:xxx'], undefined, {type: 'ban', revocation.timestamp: null})
     */
    findMany<T extends DatabaseActionType>(
        idsArray: string[],
        hwidsArray?: string[],
        customFilter: ((action: DatabaseActionType) => action is T) | object = {}
    ): T[] {
        if (!Array.isArray(idsArray)) throw new Error('idsArray should be an array');
        if (hwidsArray && !Array.isArray(hwidsArray)) throw new Error('hwidsArray should be an array or undefined');
        const idsFilter = (action: DatabaseActionType) => idsArray.some((fi) => action.ids.includes(fi))
        const hwidsFilter = (action: DatabaseActionType) => {
            if ('hwids' in action && action.hwids) {
                const count = hwidsArray!.filter((fi) => action.hwids?.includes(fi)).length;
                return count >= txConfig.banlist.requiredHwidMatches;
            } else {
                return false;
            }
        }

        try {
            //small optimization
            const idsMatchFilter = hwidsArray && hwidsArray.length && txConfig.banlist.requiredHwidMatches
                ? (a: DatabaseActionType) => idsFilter(a) || hwidsFilter(a)
                : (a: DatabaseActionType) => idsFilter(a)

            return this.chain.get('actions')
                .filter(customFilter as (a: DatabaseActionType) => a is T)
                .filter(idsMatchFilter)
                .cloneDeep()
                .value();
        } catch (error) {
            const msg = `Failed to search for a registered action database with error: ${(error as Error).message}`;
            console.verbose.error(msg);
            throw new Error(msg);
        }
    }


    /**
     * Registers a ban action and returns its id
     */
    registerBan(
        ids: string[],
        author: string,
        reason: string,
        expiration: number | false,
        playerName: string | false = false,
        hwids?: string[],
        banApprover?: string,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (expiration !== false && (typeof expiration !== 'number')) throw new Error('Invalid expiration.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');
        if (hwids && !Array.isArray(hwids)) throw new Error('Invalid hwids array.');
        if (banApprover && (typeof banApprover !== 'string' || !banApprover.length)) throw new Error('Invalid banApprover.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'ban');
            const toDB: DatabaseActionBanType = {
                id: actionID,
                type: 'ban',
                ids,
                hwids,
                playerName,
                reason,
                author,
                timestamp,
                expiration,
                banApprover,
                revocation: {
                    timestamp: null,
                    approver: null,
                    requestor: null,
                    status: null,
                },
            };
            this.chain.get('actions')
                .push(toDB)
                .value();
            this.db.writeFlag(SavePriority.HIGH);
            return actionID;
        } catch (error) {
            let msg = `Failed to register ban to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Registers a warn action and returns its id
     */
    registerWarn(
        ids: string[],
        author: string,
        reason: string,
        playerName: string | false = false,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'warn');
            const toDB: DatabaseActionWarnType = {
                id: actionID,
                type: 'warn',
                ids,
                playerName,
                reason,
                author,
                timestamp,
                expiration: false,
                acked: false,
                revocation: {
                    timestamp: null,
                    approver: null,
                    requestor: null,
                    status: null,
                },
            };
            this.chain.get('actions')
                .push(toDB)
                .value();
            this.db.writeFlag(SavePriority.HIGH);
            return actionID;
        } catch (error) {
            let msg = `Failed to register warn to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Registers a mute action and returns its id
     */
    registerMute(
        ids: string[],
        author: string,
        reason: string,
        expiration: number | false,
        playerName: string | false = false,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (expiration !== false && (typeof expiration !== 'number')) throw new Error('Invalid expiration.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'mute');
            const toDB: DatabaseActionMuteType = {
                id: actionID,
                type: 'mute',
                ids,
                playerName,
                reason,
                author,
                timestamp,
                expiration,
                revocation: {
                    timestamp: null,
                    approver: null,
                    requestor: null,
                    status: null,
                },
            };
            this.chain.get('actions')
                .push(toDB)
                .value();
            this.db.writeFlag(SavePriority.HIGH);
            return actionID;
        } catch (error) {
            let msg = `Failed to register mute to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Registers a wager blacklist action and returns its id
     */
    registerWagerBlacklist(
        ids: string[],
        author: string,
        reason: string,
        playerName: string | false = false,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'wagerblacklist');
            const toDB: DatabaseActionWagerBlacklistType = {
                id: actionID,
                type: 'wagerblacklist',
                ids,
                playerName,
                reason,
                author,
                timestamp,
                expiration: false,
                revocation: {
                    timestamp: null,
                    approver: null,
                    requestor: null,
                    status: null,
                },
            };
            this.chain.get('actions')
                .push(toDB)
                .value();
            this.db.writeFlag(SavePriority.HIGH);
            return actionID;
        } catch (error) {
            let msg = `Failed to register wager blacklist to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Marks a warning as acknowledged
     */
    ackWarn(actionId: string) {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();
            if (!action) throw new Error(`action not found`);
            if (action.type !== 'warn') throw new Error(`action is not a warn`);
            action.acked = true;
            this.db.writeFlag(SavePriority.MEDIUM);
        } catch (error) {
            const msg = `Failed to ack warn with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Updates an action to be denied.
     */
    denyRevoke(
        actionId: string,
        author: string,
        reason?: string,
    ) {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();

            if (!action) throw new Error(`action not found`);

            action.revocation.status = 'denied';
            action.revocation.approver = author;
            if (reason) {
                action.revocation.reason = reason;
            }
            this.db.writeFlag(SavePriority.HIGH);

            //Send discord log
            try {
                sendRevocationLog(cloneDeep(action));
            } catch (error) {
                console.error(`Failed to send revocation log: ${(error as Error).message}`);
            }

            return cloneDeep(action);

        } catch (error) {
            const msg = `Failed to deny revoke action with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Updates an action to be pending.
     */
    setRevokePending(
        actionId: string,
        requestor: string,
        reason?: string,
    ) {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');
        if (typeof requestor !== 'string' || !requestor.length) throw new Error('Invalid requestor.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();

            if (!action) throw new Error(`action not found`);

            action.revocation.status = 'pending';
            action.revocation.requestor = requestor;
            if (reason) {
                action.revocation.reason = reason;
            }
            this.db.writeFlag(SavePriority.HIGH);
            return cloneDeep(action);

        } catch (error) {
            const msg = `Failed to set pending revoke action with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Approves a revocation request for an action
     */
    approveRevoke(
        actionId: string,
        author: string,
        allowedTypes: string[] | true = true,
        reason?: string,
    ): DatabaseActionType {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (allowedTypes !== true && !Array.isArray(allowedTypes)) throw new Error('Invalid allowedTypes.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();

            if (!action) throw new Error(`action not found`);
            if (allowedTypes !== true && !allowedTypes.includes(action.type)) {
                throw new Error(`you do not have permission to revoke this action`);
            }

            action.revocation.timestamp = now();
            action.revocation.approver = author;
            action.revocation.status = 'approved';
            if (reason) {
                action.revocation.reason = reason;
            }
            this.db.writeFlag(SavePriority.HIGH);
            return cloneDeep(action);

        } catch (error) {
            const msg = `Failed to revoke action with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Modifies the expiration of a ban.
     */
    modifyBanDuration(
        actionId: string,
        newExpiration: number | false,
        author: string,
    ): DatabaseActionType {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');
        if (newExpiration !== false && typeof newExpiration !== 'number') throw new Error('Invalid newExpiration.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();

            if (!action) throw new Error(`action not found`);
            if (action.type !== 'ban') throw new Error(`action is not a ban`);
            if (action.revocation.timestamp) throw new Error(`cannot modify a revoked ban`);

            action.expiration = newExpiration;
            this.db.writeFlag(SavePriority.HIGH);
            //TODO: log this change? maybe a new array in the action object called 'modifications'
            return cloneDeep(action);

        } catch (error) {
            const msg = `Failed to modify ban duration with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }
}
