import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import { Textarea } from "@/components/ui/textarea";
import { txToast } from "@/components/TxToaster";
import { PlayerModalPlayerData } from "@shared/playerApiTypes";


type PlayerTargetTabProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    refreshModalData: () => void;
};

export default function PlayerTargetTab({ playerRef, player, refreshModalData }: PlayerTargetTabProps) {
    const reasonRef = useRef<HTMLTextAreaElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { isAdmin, isPcChecker } = usePermissions();
    const closeModal = useClosePlayerModal();

    const playerTargetApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/target`,
        throwGenericErrors: true,
    });

    const playerUntargetApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/untarget`,
        throwGenericErrors: true,
    });

    if (!isAdmin && !isPcChecker) {
        return <ModalCentralMessage>
            You are not allowed to target players.
        </ModalCentralMessage>;
    }

    const handleSave = () => {
        if (!reasonRef.current) return;
        const reason = reasonRef.current.value;

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            reasonRef.current.focus();
            return;
        }

        setIsSaving(true);
        playerTargetApi({
            queryParams: playerRef,
            data: { reason },
            toastLoadingMessage: 'Targeting player...',
            genericHandler: {
                successMsg: 'Player Targeted.',
            },
            success: (data) => {
                setIsSaving(false);
                refreshModalData();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    };

    const handleUntarget = () => {
        setIsSaving(true);
        playerUntargetApi({
            queryParams: playerRef,
            toastLoadingMessage: 'Untargeting player...',
            genericHandler: {
                successMsg: 'Player Untargeted.',
            },
            success: (data) => {
                setIsSaving(false);
                refreshModalData();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    };

    if (player.isTargeted) {
        return (
            <div className="grid gap-4 p-1">
                <p>This player is currently targeted by <strong>{player.targetedBy}</strong>.</p>
                <div className="flex place-content-end">
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={isSaving}
                        onClick={handleUntarget}
                    >
                        {isSaving ? (
                            <span className="flex items-center leading-relaxed">
                                <Loader2Icon className="inline animate-spin h-4" /> Untargeting...
                            </span>
                        ) : 'Untarget Player'}
                    </Button>
                </div>
            </div>
        );
    } else {
        return (
            <div className="grid gap-4 p-1">
                <Textarea
                    ref={reasonRef}
                    placeholder="Reason for targeting..."
                    className="h-24"
                    disabled={isSaving}
                />
                <div className="flex place-content-end">
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={isSaving}
                        onClick={handleSave}
                    >
                        {isSaving ? (
                            <span className="flex items-center leading-relaxed">
                                <Loader2Icon className="inline animate-spin h-4" /> Targeting...
                            </span>
                        ) : 'Target Player'}
                    </Button>
                </div>
            </div>
        );
    }
}
