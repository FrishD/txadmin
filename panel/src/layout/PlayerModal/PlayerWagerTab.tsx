import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import { Textarea } from "@/components/ui/textarea";
import { txToast } from "@/components/TxToaster";


type PlayerWagerTabProps = {
    playerRef: PlayerModalRefType;
};

export default function PlayerWagerTab({ playerRef }: PlayerWagerTabProps) {
    const reasonRef = useRef<HTMLTextAreaElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();
    const playerWagerApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/wagerblacklist`,
        throwGenericErrors: true,
    });

    if (!hasPerm('wager.staff')) {
        return <ModalCentralMessage>
            You don't have permission to wager blacklist players.
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
        playerWagerApi({
            queryParams: playerRef,
            data: { reason },
            toastLoadingMessage: 'Adding to Wager Blacklist...',
            genericHandler: {
                successMsg: 'Player added to Wager Blacklist.',
            },
            success: (data) => {
                setIsSaving(false);
                closeModal();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    };

    return (
        <div className="grid gap-4 p-1">
            <Textarea
                ref={reasonRef}
                placeholder="Reason for wager blacklist..."
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
                            <Loader2Icon className="inline animate-spin h-4" /> Adding...
                        </span>
                    ) : 'Add to Blacklist'}
                </Button>
            </div>
        </div>
    );
}
