import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import BanForm, { BanFormType } from "@/components/BanForm";
import { txToast } from "@/components/TxToaster";
import { DatabaseActionBanType } from "@core/modules/Database/databaseTypes";


type PlayerEditBanTabProps = {
    action: DatabaseActionBanType;
    playerRef: PlayerModalRefType;
    onGoBack: () => void;
};

export default function PlayerEditBanTab({ action, playerRef, onGoBack }: PlayerEditBanTabProps) {
    const banFormRef = useRef<BanFormType>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();
    const playerEditBanApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/edit_ban`,
        throwGenericErrors: true,
    });
    const playerUploadApi = useBackendApi<{ success: boolean, filename: string }>({
        method: 'POST',
        path: `/player/upload`,
        throwGenericErrors: true,
    });

    if (!hasPerm('players.ban')) {
        return <ModalCentralMessage>
            You don't have permission to edit bans.
        </ModalCentralMessage>;
    }

    const handleSave = async () => {
        if (!banFormRef.current) return;
        const { reason, proofs, proofFile } = banFormRef.current.getData();

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            banFormRef.current.focusReason();
            return;
        }

        setIsSaving(true);
        let finalProofs = proofs;
        if (proofFile) {
            const formData = new FormData();
            formData.append('proof', proofFile);
            const res = await playerUploadApi({ data: formData });
            if (res && !('error' in res)) {
                finalProofs = proofs.map(p => p === proofFile.name ? res.filename : p);
            } else {
                setIsSaving(false);
                return;
            }
        }

        playerEditBanApi({
            queryParams: playerRef,
            data: { actionId: action.id, reason, proofs: finalProofs },
            toastLoadingMessage: 'Editing ban...',
            genericHandler: {
                successMsg: 'Ban edited.',
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
            <BanForm
                ref={banFormRef}
                disabled={isSaving}
                onNavigateAway={() => { closeModal(); }}
                editMode
            />
            <div className="flex place-content-between">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onGoBack}
                >
                    Go Back
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Saving...
                        </span>
                    ) : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
