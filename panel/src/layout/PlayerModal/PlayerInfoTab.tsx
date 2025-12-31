import DateTimeCorrected from "@/components/DateTimeCorrected";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPerms } from "@/hooks/auth";
import { useBackendApi } from "@/hooks/fetch";
import { PlayerModalRefType } from "@/hooks/playerModal";
import { cn } from "@/lib/utils";
import { msToDuration, tsToLocaleDateTimeString } from "@/lib/dateTime";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { PlayerModalPlayerData } from "@shared/playerApiTypes";
import { ShieldAlertIcon, Target } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";


function LogActionCounter({ type, count }: { type: 'Ban' | 'Warn' | 'Wager', count: number }) {
    const pluralLabel = (count > 1) ? `${type}s` : type;
    if (count === 0) {
        return <span className={cn(
            'h-max rounded-sm text-xs font-semibold px-1 py-[0.125rem] tracking-widest text-center inline-block',
            'bg-secondary text-secondary-foreground'
        )}>
            0 {type}s
        </span>
    } else {
        return <span className={cn(
            'h-max rounded-sm text-xs font-semibold px-1 py-[0.125rem] tracking-widest text-center inline-block',
            type === 'Ban' ? 'bg-destructive text-destructive-foreground' :
            type === 'Wager' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
        )}>
            {count} {pluralLabel}
        </span>
    }
}

type PlayerNotesBoxProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    refreshModalData: () => void;
}

const calcTextAreaLines = (text?: string) => {
    if (!text) return 3;
    const lines = text.trim().split('\n').length + 1;
    return Math.min(Math.max(lines, 3), 16);
}

function PlayerNotesBox({ playerRef, player, refreshModalData }: PlayerNotesBoxProps) {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [notesLogText, setNotesLogText] = useState(player.notesLog ?? '');
    const [textAreaLines, setTextAreaLines] = useState(calcTextAreaLines(player.notes));
    const playerNotesApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/save_note`,
    });

    const doSaveNotes = () => {
        setNotesLogText('Saving...');
        playerNotesApi({
            queryParams: playerRef,
            data: {
                note: textAreaRef.current?.value.trim(),
            },
            success: (data) => {
                if ('error' in data) {
                    setNotesLogText(data.error);
                } else {
                    refreshModalData();
                }
            },
        });
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !window.txIsMobile) {
            event.preventDefault();
            doSaveNotes();
        } else {
            setTextAreaLines(calcTextAreaLines(event.currentTarget.value));
        }
    }

    return <>
        <Label htmlFor="playerNotes">
            Notes: <span className="text-muted-foreground">{notesLogText}</span>
        </Label>
        <Textarea
            ref={textAreaRef}
            id="playerNotes"
            className="w-full mt-1"
            disabled={!player.isRegistered}
            defaultValue={player.notes}
            onChange={() => setNotesLogText('Press enter to save.')}
            onKeyDown={handleKeyDown}
            style={{ height: `${1 + 1.25 * textAreaLines}rem` }}
            placeholder={player.isRegistered
                ? 'Type your notes about the player.'
                : 'Cannot set notes for players that are not registered.'}
        />
        {window.txIsMobile && <div className="mt-2 w-full">
            <Button
                variant="outline"
                size='xs'
                onClick={doSaveNotes}
                disabled={!player.isRegistered}
                className="w-full"
            >Save Note</Button>
        </div>}
    </>
}


type PlayerInfoTabProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    serverTime: number;
    tsFetch: number;
    setSelectedTab: (t: string) => void;
    refreshModalData: () => void;
}

export default function PlayerInfoTab({ playerRef, player, serverTime, tsFetch, setSelectedTab, refreshModalData }: PlayerInfoTabProps) {
    const { hasPerm, admin } = useAdminPerms();
    const [targetDialogOpen, setTargetDialogOpen] = useState(false);
    const [targetReason, setTargetReason] = useState('');
    const targetReasonRef = useRef<HTMLTextAreaElement>(null);

    const playerWhitelistApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/whitelist`,
    });

    const targetApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/target`,
    });

    const untargetApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/untarget`,
    });

    const sessionTimeText = !player.sessionTime ? '--' : msToDuration(
        player.sessionTime * 60_000,
        { units: ['h', 'm'] }
    );
    const lastConnectionText = !player.tsLastConnection ? '--' : <DateTimeCorrected
        className="opacity-75 cursor-help"
        serverTime={serverTime}
        tsObject={player.tsLastConnection}
        tsFetch={tsFetch}
        isDateOnly
    />;
    const playTimeText = !player.playTime ? '--' : msToDuration(
        player.playTime * 60_000,
        { units: ['d', 'h', 'm'] }
    )
    const joinDateText = !player.tsJoined ? '--' : <DateTimeCorrected
        className="opacity-75 cursor-help"
        serverTime={serverTime}
        tsObject={player.tsJoined}
        tsFetch={tsFetch}
        isDateOnly
    />;
    const whitelistedText = !player.tsWhitelisted ? 'not yet' : <DateTimeCorrected
        className="opacity-75 cursor-help"
        serverTime={serverTime}
        tsObject={player.tsWhitelisted}
        tsFetch={tsFetch}
        isDateOnly
    />;
    const banCount = player.actionHistory.filter((a) => a.type === 'ban' && !a.revokedAt).length;
    const warnCount = player.actionHistory.filter((a) => a.type === 'warn' && !a.revokedAt).length;
    const wagerBlacklistCount = player.actionHistory.filter((a) => a.type === 'wagerblacklist' && !a.revokedAt).length;

    const handleWhitelistClick = () => {
        playerWhitelistApi({
            queryParams: playerRef,
            data: {
                status: !player.tsWhitelisted
            },
            toastLoadingMessage: 'Updating whitelist...',
            genericHandler: {
                successMsg: 'Whitelist changed.',
            },
            success: (data, toastId) => {
                if ('success' in data) {
                    refreshModalData();
                }
            },
        });
    }

    // Check if current admin is targeting this player
    const isAdminTargeting = useMemo(() => {
        if (!admin?.name || !player.targetedBy || player.targetedBy.length === 0) {
            return false;
        }
        // Check if admin name appears in the targetedBy array
        return player.targetedBy.includes(admin.name);
    }, [admin?.name, player.targetedBy]);

    console.log('[TARGET DEBUG Frontend] Player:', player.displayName);
    console.log('[TARGET DEBUG Frontend] isTargeted:', player.isTargeted);
    console.log('[TARGET DEBUG Frontend] targetedBy:', player.targetedBy);
    console.log('[TARGET DEBUG Frontend] current admin:', admin?.name);
    console.log('[TARGET DEBUG Frontend] isAdminTargeting:', isAdminTargeting);

    const handleTargetClick = () => {
        if (player.isTargeted && isAdminTargeting) {
            // Untarget - admin is currently targeting
            console.log('[TARGET DEBUG Frontend] Untargeting player');
            untargetApi({
                queryParams: playerRef,
                data: {},
                toastLoadingMessage: 'Removing target...',
                genericHandler: {
                    successMsg: 'Player untargeted.',
                },
                success: async (data) => {
                    if ('success' in data) {
                        console.log('[TARGET DEBUG Frontend] Untarget successful, refreshing...');
                        setTimeout(() => {
                            refreshModalData();
                        }, 500);
                    }
                },
            });
        } else if (player.isTargeted && !isAdminTargeting) {
            // Add me to existing target
            console.log('[TARGET DEBUG Frontend] Adding to existing target');
            targetApi({
                queryParams: playerRef,
                data: { reason: 'Added to existing target' },
                toastLoadingMessage: 'Adding to target...',
                genericHandler: {
                    successMsg: 'Added to target list.',
                },
                success: async (data) => {
                    if ('success' in data) {
                        console.log('[TARGET DEBUG Frontend] Add to target successful, refreshing...');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        refreshModalData();
                    }
                },
            });
        } else {
            // New target - open dialog
            console.log('[TARGET DEBUG Frontend] Opening target dialog for new target');
            setTargetDialogOpen(true);
            setTargetReason('');
        }
    }

    const handleTargetSubmit = () => {
        const reason = targetReasonRef.current?.value.trim() || 'no reason provided';
        console.log('[TARGET DEBUG Frontend] Submitting new target with reason:', reason);
        targetApi({
            queryParams: playerRef,
            data: { reason },
            toastLoadingMessage: 'Targeting player...',
            genericHandler: {
                successMsg: 'Player targeted.',
            },
            success: async (data) => {
                if ('success' in data) {
                    console.log('[TARGET DEBUG Frontend] Target successful, refreshing...');
                    setTargetDialogOpen(false);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    refreshModalData();
                }
            },
        });
    }

    const playerBannedText: string | undefined = useMemo(() => {
        if (!player || !serverTime) return;
        let banExpiration;
        for (const action of player.actionHistory) {
            if (action.type !== 'ban' || action.revokedAt) continue;
            if (action.exp) {
                if (action.exp >= serverTime) {
                    banExpiration = Math.max(banExpiration ?? 0, action.exp);
                }
            } else {
                return 'This player is permanently banned.';
            }
        }

        if (banExpiration !== undefined) {
            const str = tsToLocaleDateTimeString(banExpiration, 'short', 'short');
            return `This player is banned until ${str}`;
        }
    }, [player, serverTime]);

    // Determine button text and variant based on current state
    const { targetButtonText, targetButtonVariant } = useMemo(() => {
        let text: string;
        let variant: "outline" | "destructive";
        
        if (!player.isTargeted) {
            text = 'Target';
            variant = 'outline';
        } else if (isAdminTargeting) {
            text = 'Untarget';
            variant = 'destructive';
        } else {
            text = 'Add Me';
            variant = 'outline';
        }

        console.log('[TARGET DEBUG Frontend] Button state:', { text, variant, isTargeted: player.isTargeted, isAdminTargeting });
        
        return { targetButtonText: text, targetButtonVariant: variant };
    }, [player.isTargeted, isAdminTargeting]);

    return <div className="p-1">
        {playerBannedText ? (
            <div className="w-full p-2 pr-3 mb-1 flex items-center justify-between space-x-4 rounded-lg border shadow-lg transition-all text-black/75 dark:text-white/90 border-warning/70 bg-warning-hint">
                <div className="flex-shrink-0 flex flex-col gap-2 items-center">
                    <ShieldAlertIcon className="size-5 text-warning" />
                </div>
                <div className="flex-grow text-sm font-medium">
                    {playerBannedText}
                </div>
            </div>
        ) : null}

        {/* Target Warning Banner */}
        {player.isTargeted && (
            <div className="w-full p-2 pr-3 mb-1 flex items-center justify-between space-x-4 rounded-lg border shadow-lg transition-all text-black/75 dark:text-white/90 border-amber-500/70 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex-shrink-0 flex flex-col gap-2 items-center">
                    <Target className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-grow">
                    <div className="text-sm font-semibold mb-0.5">Player Targeted</div>
                    <div className="text-xs text-muted-foreground">
                        By: {player.targetedBy?.join(', ') || 'Unknown'}
                    </div>
                </div>
            </div>
        )}

        <dl className="pb-2">
            {player.isConnected && <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Session Time</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{sessionTimeText}</dd>
            </div>}
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Play Time</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{playTimeText}</dd>
            </div>
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Join Date</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{joinDateText}</dd>
            </div>
            {!player.isConnected && <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Last Connection</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{lastConnectionText}</dd>
            </div>}

            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">ID Whitelisted</dt>
                <dd className="text-sm leading-6 mt-0">{whitelistedText}</dd>
                <dd className="text-right">
                    <Button
                        variant="outline"
                        size='inline'
                        style={{ minWidth: '8.25ch' }}
                        onClick={handleWhitelistClick}
                        disabled={!hasPerm('players.whitelist')}
                    >
                        {player.tsWhitelisted ? 'Remove' : 'Add WL'}
                    </Button>
                </dd>
            </div>
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Sanctions</dt>
                <dd className="text-sm leading-6 mt-0 flex flex-wrap gap-2">
                    <LogActionCounter type="Ban" count={banCount} />
                    <LogActionCounter type="Warn" count={warnCount} />
                    <LogActionCounter type="Wager" count={wagerBlacklistCount} />
                </dd>
                <dd className="text-right">
                    <Button
                        variant="outline"
                        size='inline'
                        style={{ minWidth: '8.25ch' }}
                        onClick={() => { setSelectedTab('History') }}
                    >View</Button>
                </dd>
            </div>
            
            {/* Target Row */}
        </dl>

        <PlayerNotesBox player={player} playerRef={playerRef} refreshModalData={refreshModalData} />

        {/* Target Dialog */}
    </div>;
}