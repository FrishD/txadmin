import { cn } from "@/lib/utils";
import { tsToLocaleDateTimeString } from "@/lib/dateTime";
import { PlayerHistoryItem } from "@shared/playerApiTypes";
import InlineCode from "@/components/InlineCode";
import { useOpenActionModal } from "@/hooks/actionModal";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { DatabaseActionBanType } from "@core/modules/Database/databaseTypes";
import { ExternalLinkIcon, PencilIcon } from "lucide-react";


type HistoryItemProps = {
    action: PlayerHistoryItem,
    serverTime: number,
    modalOpener: (actionId: string) => void,
    onEditBan: (action: DatabaseActionBanType) => void,
}

function HistoryItem({ action, serverTime, modalOpener, onEditBan }: HistoryItemProps) {
    const { hasPerm } = useAdminPerms();
    let footerNote, borderColorClass, actionMessage;
    if (action.type === 'ban') {
        borderColorClass = 'border-destructive';
        actionMessage = `BANNED by ${action.author}`;
    } else if (action.type === 'warn') {
        borderColorClass = 'border-warning';
        actionMessage = `WARNED by ${action.author}`;
    } else if (action.type === 'wagerblacklist') {
        borderColorClass = 'border-destructive';
        actionMessage = `WAGER BLACKLISTED by ${action.author}`;
    } else if (action.type === 'mute') {
        borderColorClass = 'border-info';
        actionMessage = `MUTED by ${action.author}`;
    }
    if (action.revokedBy) {
        borderColorClass = '';
        const revocationDate = tsToLocaleDateTimeString(action.revokedAt ?? 0, 'medium', 'short');
        footerNote = `Revoked by ${action.revokedBy} on ${revocationDate}.`;
    } else if (typeof action.exp === 'number') {
        const expirationDate = tsToLocaleDateTimeString(action.exp, 'medium', 'short');
        footerNote = (action.exp < serverTime) ? `Expired on ${expirationDate}.` : `Expires on ${expirationDate}.`;
    }

    return (
        <div
            className={cn(
                'pl-2 border-l-4 rounded-r-sm bg-muted/30',
                borderColorClass
            )}
        >
            <div className="flex w-full justify-between">
                <strong className="text-sm text-muted-foreground">{actionMessage}</strong>
                <small className="text-right text-2xs space-x-1">
                    <InlineCode className="tracking-widest">{action.id}</InlineCode>
                    <span
                        className="opacity-75 cursor-help"
                        title={tsToLocaleDateTimeString(action.ts, 'long', 'long')}
                    >
                        {tsToLocaleDateTimeString(action.ts, 'medium', 'short')}
                    </span>
                </small>
            </div>
            <span className="text-sm">{action.reason}</span>
            <div className="flex justify-between items-center">
                {footerNote && <small className="block text-xs opacity-75">{footerNote}</small>}
                <div className="flex gap-1">
                    {action.type === 'ban' && !action.revokedBy && hasPerm('players.ban') && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEditBan(action as DatabaseActionBanType)}
                        >
                            <PencilIcon className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { modalOpener(action.id) }}
                    >
                        <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}


type PlayerHistoryTabProps = {
    actionHistory: PlayerHistoryItem[],
    serverTime: number,
    refreshModalData: () => void,
    onEditBan: (action: DatabaseActionBanType) => void,
}

export default function PlayerHistoryTab({ actionHistory, serverTime, refreshModalData, onEditBan }: PlayerHistoryTabProps) {
    const openActionModal = useOpenActionModal();

    if (!actionHistory.length) {
        return <ModalCentralMessage>
            No bans/warns found.
        </ModalCentralMessage>;
    }

    const doOpenActionModal = (actionId: string) => {
        openActionModal(actionId);
    }

    const validActionTypes = ['ban', 'warn', 'mute', 'wagerblacklist'];
    const reversedActionHistory = [...actionHistory].reverse().filter(a => a.type && validActionTypes.includes(a.type));

    return <div className="flex flex-col gap-1 p-1">
        {reversedActionHistory.map((action) => (
            <HistoryItem
                key={action.id}
                action={action}
                serverTime={serverTime}
                modalOpener={doOpenActionModal}
                onEditBan={onEditBan}
            />
        ))}
    </div>;
}
