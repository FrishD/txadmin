import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import type { BanTemplatesDataType } from "@shared/otherTypes";
import BanForm, { BanFormType } from "@/components/BanForm";
import { txToast } from "@/components/TxToaster";


type PlayerBanTabProps = {
    banTemplates: BanTemplatesDataType[];
    playerRef: PlayerModalRefType;
};

export default function PlayerBanTab({ playerRef, banTemplates }: PlayerBanTabProps) {
    const banFormRef = useRef<BanFormType>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();
    const playerBanApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/ban`,
        throwGenericErrors: true,
    });
    const [approversData, setApproversData] = useState<string[] | undefined>(undefined);
    const getApproversApi = useBackendApi<string[]>({
        method: 'GET',
        path: '/adminManager/getApprovers',
    });

    useEffect(() => {
        getApproversApi({}).then((data) => {
            if (Array.isArray(data)) {
                setApproversData(data);
            }
        }).catch((error) => {
            console.error('Failed to fetch approvers:', error);
            txToast.error('Failed to load approvers list');
        });
    }, []);

    if (!hasPerm('players.ban')) {
        return <ModalCentralMessage>
            You don't have permission to ban players.
        </ModalCentralMessage>;
    }

    const handleSave = () => {
        if (!banFormRef.current) return;
        const { reason, duration, approver, blacklist } = banFormRef.current.getData();
        const isLongBan = banFormRef.current.isLongBan;

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            banFormRef.current.focusReason();
            return;
        }

        // אם יש בדיוק approver אחד ואין בחירה, השתמש בו אוטומטית
        let finalApprover = approver;
        if (isLongBan && !hasPerm('players.approve_bans') && !finalApprover && approversData?.length === 1) {
            finalApprover = approversData[0];
        }

        if (isLongBan && !hasPerm('players.approve_bans') && !finalApprover) {
            txToast.warning(`You must select an approver for bans longer than 1 week.`);
            return;
        }

        setIsSaving(true);
        playerBanApi({
            queryParams: playerRef,
            data: {reason, duration, approver: finalApprover, blacklist},
            toastLoadingMessage: 'Banning player...',
            genericHandler: {
                successMsg: 'Player banned.',
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
                banTemplates={banTemplates}
                approvers={approversData}
                disabled={isSaving}
                onNavigateAway={() => { closeModal(); }}
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
                            <Loader2Icon className="inline animate-spin h-4" /> Banning...
                        </span>
                    ) : 'Apply Ban'}
                </Button>
            </div>
        </div>
    );
}