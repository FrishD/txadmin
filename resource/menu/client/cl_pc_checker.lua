-- PC Checker Summon Notification
RegisterNetEvent('txAdmin:events:summonPlayer', function(data)
    local author = data.author

    local function drawNotification(text)
        SetTextFont(4)
        SetTextProportional(1)
        SetTextScale(0.0, 0.5)
        SetTextColour(255, 255, 255, 255)
        SetTextDropshadow(0, 0, 0, 0, 255)
        SetTextEdge(1, 0, 0, 0, 255)
        SetTextDropShadow()
        SetTextOutline()
        SetTextEntry("STRING")
        AddTextComponentString(text)
        DrawText(0.5, 0.5)
    end

    local endTime = GetGameTimer() + 30000
    while GetGameTimer() < endTime do
        drawNotification('You have been summoned for a PC check by ' .. author .. '.\\nYou have 30 seconds to go to the Waiting for PC room.\\nIt is forbidden to leave the game, and you must start recording your screen now.\\nFailure to do one or more of the following will lead to a ban without checking or clarification.')
        Wait(0)
    end
end)
