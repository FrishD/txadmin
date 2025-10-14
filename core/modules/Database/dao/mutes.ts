import { now } from "@lib/misc";
import { DbInstance } from "../instance";
import { MuteStatusType, RawMuteType } from "../databaseTypes";


/**
 * DAO for the mutes table.
 * This should be the only way to interact with the mutes table.
 */
export default class MutesDao {
    private readonly db: DbInstance;

    constructor(db: DbInstance) {
        this.db = db;
    }

    /**
     * Returns the mute status for a given license.
     */
    async getMute(license: string): Promise<MuteStatusType> {
        const rows = await this.db.query<RawMuteType[]>(
            'SELECT * FROM pma_voice_mutes WHERE license = ? AND (expiration IS NULL OR expiration > ?)',
            [license, now()]
        );
        if (!rows.length) {
            return null;
        } else {
            return {
                isActive: true,
                expiration: rows[0].expiration,
                reason: rows[0].reason,
                author: rows[0].muter,
            };
        }
    }

    /**
     * Adds or updates a mute for a given license.
     */
    async addMute(license: string, author: string, expiration: number | null, reason: string | null) {
        const query = `
            INSERT INTO pma_voice_mutes (license, identifier, expiration, muter, reason, muted)
            VALUES (?, ?, ?, ?, ?, TRUE)
            ON DUPLICATE KEY UPDATE expiration = VALUES(expiration), muter = VALUES(muter), reason = VALUES(reason), muted = TRUE
        `;
        return await this.db.query(query, [
            license,
            license,
            expiration,
            author,
            reason || 'No reason provided.'
        ]);
    }

    /**
     * Removes a mute for a given license.
     */
    async removeMute(license: string) {
        return await this.db.query('DELETE FROM pma_voice_mutes WHERE license = ?', [license]);
    }
}