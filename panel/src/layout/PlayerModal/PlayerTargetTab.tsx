import { PlayerModalPlayerData } from '@shared/playerApiTypes';
import { Button } from "@/components/ui/button";
import { useBackendApi } from "@/hooks/fetch";
import { PlayerModalRefType } from "@/hooks/playerModal";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { useAdminPerms } from "@/hooks/auth";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type PlayerTargetTabProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    refreshModalData: () => void;
}

export default function PlayerTargetTab({ playerRef, player, refreshModalData }: PlayerTargetTabProps) {
    const { hasPerm } = useAdminPerms();
    const [isRemoving, setIsRemoving] = useState(false);

    // Use the correct player actions endpoint with the action in the path
    const removeAllTargetsApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/actions/remove_all_targets`, // This matches the pattern in actions.ts
    });

    const handleRemoveAllTargets = async () => {
        if (!player.actionHistory) {
            setIsRemoving(false);
            return;
        }
        
        setIsRemoving(true);
        
        try {
            console.log('[TARGET TAB] Removing all targets for player');
            console.log('[TARGET TAB] Player ref:', playerRef);
            
            await new Promise<void>((resolve, reject) => {
                removeAllTargetsApi({
                    queryParams: playerRef, // This should contain mutex, netid, license
                    data: {}, // Empty body
                    toastLoadingMessage: 'Removing all targets...',
                    genericHandler: {
                        successMsg: 'All targets removed successfully.',
                    },
                    success: (data) => {
                        console.log('[TARGET TAB] Remove all targets response:', data);
                        if ('success' in data) {
                            resolve();
                        } else {
                            reject(new Error('Remove all targets failed'));
                        }
                    },
                    error: (error) => {
                        console.error('[TARGET TAB] Remove all targets error:', error);
                        reject(error);
                    },
                });
            });

            console.log('[TARGET TAB] Successfully removed all targets');

            // Wait a bit then refresh
            await new Promise(resolve => setTimeout(resolve, 500));
            refreshModalData();
            
        } catch (error) {
            console.error('[TARGET TAB] Failed to remove all targets:', error);
        } finally {
            setIsRemoving(false);
        }
    };

    if (!player.isTargeted) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                This player is not currently targeted.
            </div>
        );
    }

    // Get unique admin names
    const uniqueAdmins = [...new Set(player.targetedBy || [])];

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
                            {uniqueAdmins.map((adminName) => (
                                <li key={adminName}>
                                    {adminName}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
                <p>
                    Targeted players trigger notifications when they join the server.
                    Use the button below to remove all targets from this player.
                </p>
            </div>

            <div className="flex justify-center pt-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="destructive" 
                            disabled={!hasPerm('players.manage') || isRemoving}
                        >
                            {isRemoving ? 'Removing...' : 'Remove All Targets'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove All Targets</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the target from ALL admins ({uniqueAdmins.join(', ')}) who have targeted this player.
                                Are you sure you want to proceed?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemoveAllTargets}>
                                Remove All Targets
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}