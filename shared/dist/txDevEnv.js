"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTxDevEnv = void 0;
/**
 * Configuration for the TXDEV_ env variables
 */
const envConfigs = {
    SRC_PATH: {},
    FXSERVER_PATH: {},
    VITE_URL: {
        default: 'http://localhost:40122',
    },
    ENABLED: {
        default: false,
        parser: (val) => Boolean(val)
    },
    VERBOSE: {
        default: false,
        parser: (val) => Boolean(val)
    },
    CFXKEY: {},
    STEAMKEY: {},
    EXT_STATS_HOST: {},
    LAUNCH_ARGS: {
        parser: (val) => {
            const filtered = val.split(/\s+/).filter(Boolean);
            return filtered.length ? filtered : undefined;
        }
    },
};
/**
 * Parses the TXDEV_ env variables
 */
const parseTxDevEnv = () => {
    //@ts-ignore will be filled below
    const txDevEnv = {};
    for (const key of Object.keys(envConfigs)) {
        const keyConfig = envConfigs[key];
        const value = process.env[`TXDEV_` + key];
        if (value === undefined) {
            if ('default' in keyConfig) {
                txDevEnv[key] = keyConfig.default;
            }
        }
        else {
            if ('parser' in keyConfig) {
                const parsed = keyConfig.parser(value);
                if (parsed !== undefined) {
                    txDevEnv[key] = parsed;
                }
            }
            else {
                txDevEnv[key] = value;
            }
        }
    }
    return txDevEnv;
};
exports.parseTxDevEnv = parseTxDevEnv;
