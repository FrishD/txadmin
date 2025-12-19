import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPerms } from "@/hooks/auth";
import { useBackendApi } from "@/hooks/fetch";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { HistoryActionType } from "@shared/historyApiTypes";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { PlayerModalRefType } from "@/hooks/playerModal";

type ActionModifyReasonTabProps = {
    action: HistoryActionType;
    playerRef: PlayerModalRefType;
    refreshModalData: () => void;
};

export default function ActionModifyReasonTab({ action, playerRef, refreshModalData }: ActionModifyReasonTabProps) {
    const [reason, setReason] = useState(action.reason);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const editBanReasonApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/edit_ban_reason`,
        throwGenericErrors: true,
    });

    if (!hasPerm('players.ban')) {
        return <div className="text-destructive-inline">You don't have permission to edit ban reasons.</div>;
    }

    const handleSave = () => {
        setIsSaving(true);
        editBanReasonApi({
            queryParams: playerRef,
            data: { actionId: action.id, reason },
            toastLoadingMessage: 'Editing ban reason...',
            genericHandler: {
                successMsg: 'Ban reason edited.',
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

    return (
        <div className="grid gap-4 p-1">
            <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSaving}
                className="h-32"
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
                            <Loader2Icon className="inline animate-spin h-4" /> Saving...
                        </span>
                    ) : 'Save Reason'}
                </Button>
            </div>
        </div>
    );
}
