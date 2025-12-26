import { cloneDeep } from 'lodash-es';
import { DbInstance, SavePriority } from "../instance";
import { DatabaseActionBanType, DatabaseActionMuteType, DatabaseActionType, DatabaseActionWarnType, DatabaseActionWagerBlacklistType, DatabaseActionPcCheckType, DatabaseActionSummonType, DatabaseActionTargetType } from "../databaseTypes";
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

            //Auto link PC Check
            const pcChecks = this.findMany(ids, undefined, { type: 'pc_check' }) as DatabaseActionPcCheckType[];
            const recentChecks = pcChecks.filter(check => check.timestamp > timestamp - 3600 && check.caught && !check.banId);
            if (recentChecks.length) {
                const sortedChecks = recentChecks.sort((a, b) => b.timestamp - a.timestamp);
                sortedChecks[0].banId = actionID;
            }

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
     * Registers a target action and returns its id
     */
    registerTarget(
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
            const actionID = genActionID(this.dbo, 'target');
            const toDB: DatabaseActionTargetType = {
                id: actionID,
                type: 'target',
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

            //Update player model
            const license = ids.find(id => id.startsWith('license:'));
            if(license){
                const player = this.db.players.findOne(license);
                if(player){
                    const srcSymbol = Symbol('registerTarget');
                    this.db.players.update(license, { isTargeted: true, targetedBy: author }, srcSymbol);
                }
            }

            return actionID;
        } catch (error) {
            let msg = `Failed to register target to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Registers a summon action and returns its id
     */
    registerSummon(
        ids: string[],
        author: string,
        playerName: string | false = false,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'summon');
            const toDB: DatabaseActionSummonType = {
                id: actionID,
                type: 'summon',
                ids,
                playerName,
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
            let msg = `Failed to register summon to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
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
        const idsFilter = (action: DatabaseActionType) => {
            return Array.isArray(action.ids) && idsArray.some((fi) => action.ids.includes(fi));
        }
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
        blacklist?: boolean,
        pcCheckId?: string,
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
                blacklist,
                pcCheckId,
                revocation: {
                    timestamp: null,
                    approver: null,
                    requestor: null,
                    status: null,
                },
            };

            //Auto link PC Check
            const pcChecks = this.findMany(ids, undefined, { type: 'pc_check' }) as DatabaseActionPcCheckType[];
            const recentChecks = pcChecks.filter(check => check.timestamp > timestamp - 3600 && check.caught && !check.banId);
            if (recentChecks.length && !pcCheckId) {
                const sortedChecks = recentChecks.sort((a, b) => b.timestamp - a.timestamp);
                sortedChecks[0].banId = actionID;
            }

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
    async approveRevoke(
        actionId: string,
        author: string,
        allowedTypes: string[] | true = true,
        reason?: string,
    ): Promise<{ action: DatabaseActionType, blacklistRoleRemoved: boolean }> {
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
            const revokedAction = cloneDeep(action);
            const { blacklistRoleRemoved } = await this._handleRevocationSideEffects(revokedAction, author, reason);
            return { action: revokedAction, blacklistRoleRemoved };

        } catch (error) {
            const msg = `Failed to revoke action with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Handles the side effects of a revocation, such as removing discord roles.
     * This is not supposed to be called directly, only by approveRevoke.
     */
    private async _handleRevocationSideEffects(
        revokedAction: DatabaseActionType,
        author: string,
        reason?: string,
    ): Promise<{ blacklistRoleRemoved: boolean }> {
        let blacklistRoleRemoved = false;

        // Target specific logic
        if (revokedAction.type === 'target') {
            const license = revokedAction.ids.find(id => id.startsWith('license:'));
            if (license) {
                const player = this.db.players.findOne(license);
                if (player) {
                    const srcSymbol = Symbol('revokeTarget');
                    this.db.players.update(license, { isTargeted: false, targetedBy: undefined }, srcSymbol);
                }
            }
        }

        // Mute specific logic
        if (revokedAction.type === 'mute') {
            const license = revokedAction.ids.find(id => typeof id === 'string' && id.startsWith('license:'));
            if (license) {
                txCore.fxRunner.sendEvent('playerUnmuted', {
                    author,
                    targetLicense: license,
                    targetName: revokedAction.playerName,
                });
            }
        }

        // Wager blacklist specific logic
        if (revokedAction.type === 'wagerblacklist') {
            if (txConfig.discordBot.wagerBlacklistRole) {
                try {
                    const discordId = revokedAction.ids.find(id => typeof id === 'string' && id.startsWith('discord:'));
                    if (discordId) {
                        const uid = discordId.substring(8);
                        await txCore.discordBot.removeMemberRole(uid, txConfig.discordBot.wagerBlacklistRole);
                        if (txConfig.discordBot.wagerRevokeLogChannel) {
                            const member = await txCore.discordBot.guild?.members.fetch(uid);
                            if (member) {
                                sendWagerBlacklistLog(txConfig.discordBot.wagerRevokeLogChannel, author, member, reason ?? 'no reason provided', true);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Failed to remove wager blacklist role or send log for action ${revokedAction.id}:`);
                    console.error(error);
                }
            }
        }

        // Ban blacklist specific logic
        if (revokedAction.type === 'ban' && 'blacklist' in revokedAction && revokedAction.blacklist && txConfig.discordBot.blacklistRole) {
            console.log(`[Blacklist Revoke] Action ${revokedAction.id} is a blacklisted ban. Processing...`);
            try {
                const discordId = revokedAction.ids.find(id => typeof id === 'string' && id.startsWith('discord:'));
                if (discordId) {
                    console.log(`[Blacklist Revoke] Found Discord ID: ${discordId}`);
                    const uid = discordId.substring(8);
                    const activeBlacklist = this.findMany(
                        [discordId],
                        undefined,
                        { type: 'ban', 'revocation.timestamp': null, blacklist: true }
                    );
                    console.log(`[Blacklist Revoke] Found ${activeBlacklist.length} other active blacklist bans for this user.`);
                    if (!activeBlacklist.length) {
                        console.log(`[Blacklist Revoke] No other active blacklist bans found. Removing blacklist role and adding complementary role.`);
                        await txCore.discordBot.removeMemberRole(uid, txConfig.discordBot.blacklistRole);
                        if (txConfig.discordBot.complementaryRole) {
                            await txCore.discordBot.addMemberRole(uid, txConfig.discordBot.complementaryRole);
                        }
                        //TODO: log this to the admin?
                        // ctx.admin.logAction(`Removed blacklist role from "${revokedAction.playerName}".`);
                        console.log(`[Blacklist Revoke] Roles updated successfully.`);
                        blacklistRoleRemoved = true;
                    }
                } else {
                    console.log(`[Blacklist Revoke] No Discord ID found for this user.`);
                }
            } catch (error) {
                console.error(`[Blacklist Revoke] Failed to remove blacklist role for action ${revokedAction.id}:`);
                console.error(error);
            }
        }

        // Dispatch `txAdmin:events:actionRevoked`
        try {
            txCore.fxRunner.sendEvent('actionRevoked', {
                actionId: revokedAction.id,
                actionType: revokedAction.type,
                actionReason: revokedAction.reason,
                actionAuthor: revokedAction.author,
                playerName: revokedAction.playerName,
                playerIds: revokedAction.ids,
                playerHwids: 'hwids' in revokedAction ? revokedAction.hwids : [],
                revokedBy: author,
            });
        } catch (error) { }

        return { blacklistRoleRemoved };
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


    /**
     * Modifies the reason of a ban.
     */
    modifyBanReason(
        actionId: string,
        newReason: string,
        author: string,
    ): DatabaseActionType {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');
        if (typeof newReason !== 'string' || !newReason.length) throw new Error('Invalid newReason.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();

            if (!action) throw new Error(`action not found`);
            if (action.type !== 'ban') throw new Error(`action is not a ban`);
            if (action.revocation.timestamp) throw new Error(`cannot modify a revoked ban`);

            action.oldReason = action.reason;
            action.reason = newReason;
            this.db.writeFlag(SavePriority.HIGH);
            //TODO: log this change? maybe a new array in the action object called 'modifications'
            return cloneDeep(action);

        } catch (error) {
            const msg = `Failed to modify ban reason with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }

    /**
     * Registers a PC Check action and returns its id
     */
    registerPcCheck(
        ids: string[],
        author: string,
        reason: string,
        caught: boolean,
        supervisor: string,
        approver: string,
        proofs: string[],
        playerName: string | false = false,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (typeof caught !== 'boolean') throw new Error('Invalid caught value.');
        if (typeof supervisor !== 'string' || !supervisor.length) throw new Error('Invalid supervisor.');
        if (typeof approver !== 'string' || !approver.length) throw new Error('Invalid approver.');
        if (!Array.isArray(proofs)) throw new Error('Invalid proofs array.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'pc_check');
            const toDB: DatabaseActionPcCheckType = {
                id: actionID,
                type: 'pc_check',
                ids,
                playerName,
                reason,
                author,
                timestamp,
                expiration: false,
                caught,
                supervisor,
                approver,
                proofs,
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
            let msg = `Failed to register PC Check to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }

    /**
     * Links a ban to a PC Check action
     */
    linkBan(pcCheckId: string, banId: string) {
        if (typeof pcCheckId !== 'string' || !pcCheckId.length) throw new Error('Invalid pcCheckId.');
        if (typeof banId !== 'string' || !banId.length) throw new Error('Invalid banId.');

        try {
            const pcCheck = this.chain.get('actions')
                .find({ id: pcCheckId })
                .value() as DatabaseActionPcCheckType;

            if (!pcCheck) throw new Error(`PC Check action not found`);
            if (pcCheck.type !== 'pc_check') throw new Error(`Action is not a PC Check`);

            const ban = this.chain.get('actions')
                .find({ id: banId })
                .value() as DatabaseActionBanType;

            if (!ban) throw new Error(`Ban action not found`);
            if (ban.type !== 'ban') throw new Error(`Action is not a ban`);

            pcCheck.banId = banId;
            this.db.writeFlag(SavePriority.HIGH);
            return cloneDeep(pcCheck);

        } catch (error) {
            const msg = `Failed to link ban to PC Check with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }
}
