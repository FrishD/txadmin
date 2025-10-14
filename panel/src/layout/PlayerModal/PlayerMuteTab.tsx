import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon, MicOffIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import { PlayerModalPlayerData } from "@shared/playerApiTypes";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { txToast } from "@/components/TxToaster";
import { tsToLocaleDateTimeString } from "@/lib/dateTime";


type PlayerMuteTabProps = {
    player: PlayerModalPlayerData;
    playerRef: PlayerModalRefType;
    refreshModalData: () => void;
};

export default function PlayerMuteTab({ player, playerRef, refreshModalData }: PlayerMuteTabProps) {
    const [reason, setReason] = useState("");
    const [duration, setDuration] = useState("1 hour");
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();

    const playerMuteApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/mute`,
        throwGenericErrors: true,
    });

    const playerUnmuteApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/unmute`,
        throwGenericErrors: true,
    });

    const activeMute = useMemo(() => {
        return player.actionHistory.find(a => a.type === 'mute' && !a.revokedAt);
    }, [player.actionHistory]);


    if (!hasPerm('players.mute')) {
        return <ModalCentralMessage>
            You don't have permission to mute players.
        </ModalCentralMessage>;
    }

    const handleMute = () => {
        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            return;
        }

        setIsSaving(true);
        playerMuteApi({
            queryParams: playerRef,
            data: { reason, duration },
            toastLoadingMessage: 'Muting player...',
            genericHandler: {
                successMsg: 'Player Muted.',
            },
            success: (data) => {
                setIsSaving(false);
                refreshModalData();
                closeModal();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    };

    const handleUnmute = () => {
        setIsSaving(true);
        playerUnmuteApi({
            queryParams: playerRef,
            toastLoadingMessage: 'Unmuting player...',
            genericHandler: {
                successMsg: 'Player Unmuted.',
            },
            success: (data) => {
                setIsSaving(false);
                refreshModalData();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    }

    if (activeMute) {
        return (
            <div className="p-4">
                <h2 className="text-lg font-bold mb-4">Mute Status</h2>
                <p>This player is currently muted.</p>
                <p><strong>Muted by:</strong> {activeMute.author}</p>
                <p><strong>Reason:</strong> {activeMute.reason}</p>
                {activeMute.exp && <p><strong>Expires:</strong> {tsToLocaleDateTimeString(activeMute.exp)}</p>}
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={handleUnmute}
                    className="mt-4"
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Unmuting...
                        </span>
                    ) : (
                        <><MicOffIcon className="inline h-4 mr-1" /> Unmute Player</>
                    )}
                </Button>
            </div>
        )
    }

    return (
        <div className="grid gap-4 p-1">
            <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isSaving}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration} disabled={isSaving}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a duration" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5 minutes">5 Minutes</SelectItem>
                        <SelectItem value="30 minutes">30 Minutes</SelectItem>
                        <SelectItem value="1 hour">1 Hour</SelectItem>
                        <SelectItem value="8 hours">8 Hours</SelectItem>
                        <SelectItem value="1 day">1 Day</SelectItem>
                        <SelectItem value="3 days">3 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex place-content-end">
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={handleMute}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Muting...
                        </span>
                    ) : 'Mute Player'}
                </Button>
            </div>
        </div>
    );
}