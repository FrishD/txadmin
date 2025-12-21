import { cn } from "@/lib/utils";
import { tsToLocaleDateTimeString } from "@/lib/dateTime";
import { PlayerHistoryItem } from "@shared/playerApiTypes";
import InlineCode from "@/components/InlineCode";
import { useOpenActionModal } from "@/hooks/actionModal";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import { useOpenPromptDialog } from "@/hooks/dialogs";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";


type HistoryItemProps = {
    action: PlayerHistoryItem,
    serverTime: number,
    modalOpener: (actionId: string) => void,
    handleLinkBanToPcCheck: (pcCheckId: string) => void,
}

function HistoryItem({ action, serverTime, modalOpener, handleLinkBanToPcCheck }: HistoryItemProps) {
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
    } else if (action.type === 'pcCheck') {
        borderColorClass = 'border-info';
        actionMessage = `PC CHECK by ${action.author}`;
    }
    if (action.revokedBy) {
        borderColorClass = '';
        const revocationDate = tsToLocaleDateTimeString(action.revokedAt ?? 0, 'medium', 'short');
        footerNote = `Revoked by ${action.revokedBy} on ${revocationDate}.`;
    } else if (typeof action.exp === 'number') {
        const expirationDate = tsToLocaleDateTimeString(action.exp, 'medium', 'short');
        footerNote = (action.exp < serverTime) ? `Expired on ${expirationDate}.` : `Expires in ${expirationDate}.`;
    }

    return (
        <div
            onClick={() => { modalOpener(action.id) }}
            className={cn(
                'pl-2 border-l-4 hover:bg-muted rounded-r-sm bg-muted/30 cursor-pointer',
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
            {action.type === 'pcCheck' && (
                <div className="flex justify-between items-center">
                    <span className={cn(
                        "text-xs font-bold",
                        action.caught ? "text-destructive-inline" : "text-success-inline"
                    )}>
                        {action.caught ? "Caught" : "Not Caught"}
                    </span>
                    <div className="flex gap-2">
                        {action.proofs?.map((proof, i) => (
                            <a
                                key={proof}
                                href={`/proof/${proof}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                            >
                                Proof #{i + 1}
                            </a>
                        ))}
                    </div>
                    {!action.banId && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLinkBanToPcCheck(action.id);
                            }}
                            className="text-xs text-primary hover:underline"
                        >
                            Link to Ban
                        </button>
                    )}
                </div>
            )}
            {footerNote && <small className="block text-xs opacity-75">{footerNote}</small>}
        </div>
    );
}


type PlayerHistoryTabProps = {
    actionHistory: PlayerHistoryItem[],
    serverTime: number,
    refreshModalData: () => void,
}

export default function PlayerHistoryTab({ actionHistory, serverTime, refreshModalData }: PlayerHistoryTabProps) {
    const openActionModal = useOpenActionModal();

    if (!actionHistory.length) {
        return <ModalCentralMessage>
            No bans/warns found.
        </ModalCentralMessage>;
    }

    const openPromptDialog = useOpenPromptDialog();
    const linkBanApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/link_ban_to_pc_check`,
    });

    const handleLinkBanToPcCheck = (pcCheckId: string) => {
        openPromptDialog({
            title: `Link Ban to PC Check`,
            message: 'Enter the Ban ID to link to this PC Check report.',
            placeholder: 'Ban ID',
            submitLabel: 'Link',
            required: true,
            onSubmit: (banId) => {
                linkBanApi({
                    data: { pcCheckId, banId },
                    genericHandler: { successMsg: 'Ban linked to PC Check report.' },
                    toastLoadingMessage: 'Linking ban to PC Check report...',
                    success: () => {
                        refreshModalData();
                    }
                });
            }
        });
    }

    const doOpenActionModal = (actionId: string) => {
        openActionModal(actionId);
    }

    const reversedActionHistory = [...actionHistory].reverse();
    return <div className="flex flex-col gap-1 p-1">
        {reversedActionHistory.map((action) => (
            <HistoryItem
                key={action.id}
                action={action}
                serverTime={serverTime}
                modalOpener={doOpenActionModal}
                handleLinkBanToPcCheck={handleLinkBanToPcCheck}
            />
        ))}
    </div>;
}
