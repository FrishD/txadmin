RegisterNetEvent('txAdmin:events:playerMuted', function(eventData)
    if not eventData.targetLicense or not eventData.author or not eventData.reason or not eventData.expiration then
        return
    end

    print(string.format('Received playerMuted event for %s', eventData.targetName))
    exports['pma-voice']:mutePlayer(eventData.targetLicense, eventData.author, eventData.reason, eventData.expiration)
end)

RegisterNetEvent('txAdmin:events:playerUnmuted', function(eventData)
    if not eventData.targetLicense then
        return
    end

    print(string.format('Received playerUnmuted event for %s', eventData.targetName))
    exports['pma-voice']:unmutePlayer(eventData.targetLicense)
end)