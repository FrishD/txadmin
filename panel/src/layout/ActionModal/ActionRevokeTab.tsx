import { useState } from "react";
import type { DatabaseActionType } from "../../../../core/modules/Database/databaseTypes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { txToast } from "@/components/TxToaster";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { useAdminPerms } from "@/hooks/auth";
import { Loader2Icon } from "lucide-react";
import { useBackendApi } from "@/hooks/fetch";
import type { ApiRevokeActionReqSchema } from "../../../../core/routes/history/actions";


type ActionRevokeTabProps = {
    action: DatabaseActionType;
    refreshModalData: () => void;
}

export default function ActionRevokeTab({ action, refreshModalData }: ActionRevokeTabProps) {
    const [isRevoking, setIsRevoking] = useState(false);
    const [revokeReason, setRevokeReason] = useState("");
    const { hasPerm } = useAdminPerms();
    const revokeActionApi = useBackendApi<GenericApiOkResp, ApiRevokeActionReqSchema>({
        method: 'POST',
        path: `/history/revokeAction`,
    });

    const upperCasedType = action.type.charAt(0).toUpperCase() + action.type.slice(1);
    const doRevokeAction = () => {
        if (revokeReason.trim().length < 3) {
            txToast.warning('The reason must be at least 3 characters long.');
            return;
        }
        setIsRevoking(true);
        revokeActionApi({
            data: { actionId: action.id, reason: revokeReason },
            toastLoadingMessage: `Revoking ${action.type}...`,
            genericHandler: {
                successMsg: `${upperCasedType} revoked.`,
            },
            success: (data) => {
                setIsRevoking(false);
                if ('success' in data) {
                    refreshModalData();
                }
            },
        });
    }

    const isAlreadyRevoked = !!action.revocation.timestamp;
    const permMap = {
        'warn': 'players.warn',
        'ban': 'players.ban',
        'wagerblacklist': 'wager.head',
    }
    const hasRevokePerm = hasPerm(permMap[action.type as keyof typeof permMap]);
    const revokeBtnLabel = isAlreadyRevoked
        ? `${action.type} revoked`
        : hasRevokePerm
            ? `Revoke ${upperCasedType}`
            : 'Revoke (no permission)';
    return (
        <div className="flex flex-col gap-4 px-1 mb-1 md:mb-4">
            <div className="space-y-2">
                <h3 className="text-xl">Revoke {upperCasedType}</h3>
                <p className="text-muted-foreground text-sm">
                    This is generally done when the player successfully appeals the {action.type} or the admin regrets issuing it.
                    <ul className="list-disc list-inside pt-1">
                        {action.type === 'ban' && <li>The player will be able to rejoin the server.</li>}
                        <li>The player will not be notified of the revocation.</li>
                        <li>This {action.type} will not be removed from the player history.</li>
                        <li>The revocation cannot be undone!</li>
                    </ul>
                </p>

                <Textarea
                    id="revokeReason"
                    placeholder="Reason for revoking this action..."
                    className="w-full mt-1"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    disabled={isAlreadyRevoked || !hasRevokePerm || isRevoking}
                />
                <Button
                    variant="destructive"
                    size='xs'
                    className="col-start-1 col-span-full xs:col-span-3 xs:col-start-2"
                    type="submit"
                    disabled={isAlreadyRevoked || !hasRevokePerm || isRevoking}
                    onClick={doRevokeAction}
                >
                    {isRevoking ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Revoking...
                        </span>
                    ) : revokeBtnLabel}
                </Button>
            </div>
        </div>
    );
}
