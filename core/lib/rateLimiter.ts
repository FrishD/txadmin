const modulename = 'RateLimiter';
import consoleFactory from './console';
const console = consoleFactory(modulename);

const banRateLimit = 3;
const banRateLimitPeriod = 30 * 60 * 1000; // 30 minutes

const adminBanTimestamps: Map<string, number[]> = new Map();

/**
 * Checks if an admin is rate-limited for banning players.
 * If not, it registers a new ban timestamp.
 * @param adminName
 */
export function checkBanRateLimit(adminName: string): boolean {
    const now = Date.now();
    const adminTimestamps = adminBanTimestamps.get(adminName) || [];

    const recentTimestamps = adminTimestamps.filter(
        (timestamp) => now - timestamp < banRateLimitPeriod
    );

    if (recentTimestamps.length >= banRateLimit) {
        console.warn(`Admin ${adminName} has been rate-limited for banning.`);
        return false;
    }

    recentTimestamps.push(now);
    adminBanTimestamps.set(adminName, recentTimestamps);
    return true;
}
