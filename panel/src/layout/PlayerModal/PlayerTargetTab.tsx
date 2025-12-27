import { PlayerModalPlayerData } from '@shared/playerApiTypes';

type PlayerTargetTabProps = {
    player: PlayerModalPlayerData;
}

export default function PlayerTargetTab({ player }: PlayerTargetTabProps) {
    if (!player.isTargeted) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                This player is not currently targeted.
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Target Information
                </h3>
                <div className="space-y-2">
                    <div>
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Targeted by:
                        </span>
                        <ul className="list-disc list-inside mt-1 text-amber-700 dark:text-amber-300">
                            {player.targetedBy?.map((adminName) => (
                                <li key={adminName}>{adminName}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
                <p>
                    Targeted players trigger notifications when they join the server.
                    Use the "Target Status" section in the Info tab to manage targeting.
                </p>
            </div>
        </div>
    );
}
