--[[
    Persistent Mute System for txAdmin
    Leverages oxmysql for database storage.
    This script provides commands and exports to manage player mutes.
]]

-- Ensure oxmysql is available
if GetResourceState('oxmysql') ~= 'started' then
    error('[txAdmin-Mute] oxmysql is not started. Please ensure oxmysql is started before txAdmin.')
end

-- Create the mutes table if it doesn't exist
exports.oxmysql:execute([[
    CREATE TABLE IF NOT EXISTS `pma_voice_mutes` (
        `id` INT NOT NULL AUTO_INCREMENT,
        `license` VARCHAR(255) NOT NULL,
        `identifier` VARCHAR(255) NULL DEFAULT NULL,
        `muted` BOOLEAN DEFAULT TRUE,
        `expiration` BIGINT NULL DEFAULT NULL,
        `muter` VARCHAR(255) NULL DEFAULT NULL,
        `reason` VARCHAR(255) NULL DEFAULT NULL,
        PRIMARY KEY (`id`),
        UNIQUE INDEX `license_UNIQUE` (`license` ASC)
    );
]], {})

-- Function to get player license identifier
local function getPlayerLicense(playerId)
    for _, identifier in ipairs(GetPlayerIdentifiers(playerId)) do
        if string.sub(identifier, 1, string.len("license:")) == "license:" then
            return identifier
        end
    end
    return nil
end

-- This function should be replaced with the actual export from your voice system (e.g., pma-voice)
local function setPlayerMutedState(playerId, muted)
    if GetResourceState('pma-voice') == 'started' then
        exports['pma-voice']:SetPlayerMuted(playerId, muted)
    elseif GetResourceState('mumble-voip') == 'started' then
        MumbleSetPlayerMuted(playerId, muted)
    else
        -- print('[txAdmin-Mute] No supported voice chat resource found (pma-voice, mumble-voip). Cannot enforce mute.')
    end
end

-- Local function to check mute status, used by export and internal threads
local function checkPlayerMuteStatus(playerId, callback)
    local license = getPlayerLicense(playerId)
    if not license then
        if callback then callback(false) end
        return
    end

    exports.oxmysql:scalar('SELECT COUNT(*) FROM pma_voice_mutes WHERE license = ? AND (expiration IS NULL OR expiration > ?)', { license, os.time() }, function(count)
        if callback then callback(count > 0) end
    end)
end

-- Export to check if a player is muted
exports('isPlayerMuted', checkPlayerMuteStatus)


-- Command to mute a player
RegisterCommand('muteply', function(source, args, rawCommand)
    local adminName = "Console"
    if source > 0 then
        -- Ideally, you would have a permission check here for the source player
        adminName = GetPlayerName(source)
    end

    local targetId = tonumber(args[1])
    local duration = tonumber(args[2])
    local reason = table.concat(args, ' ', 3) or "No reason provided."

    if not targetId then
        print('[txAdmin-Mute] Usage: muteply <player_id> [duration_in_seconds] [reason]')
        return
    end

    local targetPlayerName = GetPlayerName(targetId)
    if not targetPlayerName then
        print('[txAdmin-Mute] Invalid player ID.')
        return
    end

    local license = getPlayerLicense(targetId)
    if not license then
        print('[txAdmin-Mute] Could not get license for player.')
        return
    end

    local expiration = nil
    if duration and duration > 0 then
        expiration = os.time() + duration
    end

    -- Using INSERT ... ON DUPLICATE KEY UPDATE to handle existing mutes
    exports.oxmysql:execute(
        'INSERT INTO pma_voice_mutes (license, identifier, expiration, muter, reason) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE expiration = VALUES(expiration), muter = VALUES(muter), reason = VALUES(reason)',
        { license, license, expiration, adminName, reason },
        function(result)
            if result and result.affectedRows > 0 then
                local durationText = duration and ('for ' .. duration .. ' seconds') or 'permanently'
                print(string.format('[txAdmin-Mute] Player %s (ID: %d) has been muted %s. Reason: %s', targetPlayerName, targetId, durationText, reason))
                setPlayerMutedState(targetId, true)
            else
                print('[txAdmin-Mute] Failed to mute player.')
            end
        end)
end, true) -- Restricted to admins/console

-- Command to unmute a player
RegisterCommand('unmuteply', function(source, args, rawCommand)
    local targetId = tonumber(args[1])
    if not targetId then
        print('[txAdmin-Mute] Usage: unmuteply <player_id>')
        return
    end

    local targetPlayerName = GetPlayerName(targetId)
    if not targetPlayerName then
        print('[txAdmin-Mute] Invalid player ID.')
        return
    end

    local license = getPlayerLicense(targetId)
    if not license then
        print('[txAdmin-Mute] Could not get license for player.')
        return
    end

    exports.oxmysql:execute('DELETE FROM pma_voice_mutes WHERE license = ?', { license }, function(result)
        if result and result.affectedRows > 0 then
            print(string.format('[txAdmin-Mute] Player %s (ID: %d) has been unmuted.', targetPlayerName, targetId))
            setPlayerMutedState(targetId, false)
        else
            print('[txAdmin-Mute] Player is not muted or could not be unmuted.')
        end
    end)
end, true) -- Restricted to admins/console

-- Event handlers for web panel actions
RegisterNetEvent('txaMutePlayer', function(data)
    local license = data.license
    local expiration = data.expiration
    local reason = data.reason
    local author = data.author

    if not license then
        print('[txAdmin-Mute] txaMutePlayer event error: license missing.')
        return
    end

    exports.oxmysql:execute(
        'INSERT INTO pma_voice_mutes (license, identifier, expiration, muter, reason) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE expiration = VALUES(expiration), muter = VALUES(muter), reason = VALUES(reason)',
        { license, license, expiration, author, reason },
        function(result)
            if result and result.affectedRows > 0 then
                print(string.format('[txAdmin-Mute] Player with license %s has been muted.', license))
                -- Find player and mute them if online
                for _, playerId in ipairs(GetPlayers()) do
                    if getPlayerLicense(playerId) == license then
                        setPlayerMutedState(playerId, true)
                        break
                    end
                end
            else
                print('[txAdmin-Mute] Failed to mute player via event.')
            end
        end)
end)

RegisterNetEvent('txaUnmutePlayer', function(data)
    local license = data.license
    if not license then
        print('[txAdmin-Mute] txaUnmutePlayer event error: license missing.')
        return
    end

    exports.oxmysql:execute('DELETE FROM pma_voice_mutes WHERE license = ?', { license }, function(result)
        if result and result.affectedRows > 0 then
            print(string.format('[txAdmin-Mute] Player with license %s has been unmuted.', license))
            -- Find player and unmute them if online
            for _, playerId in ipairs(GetPlayers()) do
                if getPlayerLicense(playerId) == license then
                    setPlayerMutedState(playerId, false)
                    break
                end
            end
        else
            print('[txAdmin-Mute] Player not muted or could not be unmuted via event.')
        end
    end)
end)

-- Thread to handle mute expirations and enforce mutes for all players
Citizen.CreateThread(function()
    while true do
        -- Check every 30 seconds
        Citizen.Wait(30000)

        -- Remove expired mutes
        exports.oxmysql:execute('DELETE FROM pma_voice_mutes WHERE expiration IS NOT NULL AND expiration <= ?', { os.time() })

        -- Enforce mute state for all online players
        for _, playerId in ipairs(GetPlayers()) do
            checkPlayerMuteStatus(playerId, function(isMuted)
                setPlayerMutedState(playerId, isMuted)
            end)
        end
    end
end)

-- Enforce mute on player spawn
AddEventHandler('playerSpawned', function(spawn)
    local playerId = source
    checkPlayerMuteStatus(playerId, function(isMuted)
        setPlayerMutedState(playerId, isMuted)
    end)
end)

print('[txAdmin-Mute] Persistent Mute System Loaded.')