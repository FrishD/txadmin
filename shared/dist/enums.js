"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordBotStatus = exports.FxMonitorHealth = exports.TxConfigState = void 0;
var TxConfigState;
(function (TxConfigState) {
    TxConfigState["Unkown"] = "unknown";
    TxConfigState["Setup"] = "setup";
    TxConfigState["Deployer"] = "deployer";
    TxConfigState["Ready"] = "ready";
})(TxConfigState || (exports.TxConfigState = TxConfigState = {}));
var FxMonitorHealth;
(function (FxMonitorHealth) {
    FxMonitorHealth["OFFLINE"] = "OFFLINE";
    FxMonitorHealth["ONLINE"] = "ONLINE";
    FxMonitorHealth["PARTIAL"] = "PARTIAL";
})(FxMonitorHealth || (exports.FxMonitorHealth = FxMonitorHealth = {}));
var DiscordBotStatus;
(function (DiscordBotStatus) {
    DiscordBotStatus[DiscordBotStatus["Disabled"] = 0] = "Disabled";
    DiscordBotStatus[DiscordBotStatus["Starting"] = 1] = "Starting";
    DiscordBotStatus[DiscordBotStatus["Ready"] = 2] = "Ready";
    DiscordBotStatus[DiscordBotStatus["Error"] = 3] = "Error";
})(DiscordBotStatus || (exports.DiscordBotStatus = DiscordBotStatus = {}));
