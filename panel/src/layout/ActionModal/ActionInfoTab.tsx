import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { msToDuration } from "@/lib/dateTime";
import { useRef, useState } from "react";
import type { DatabaseActionType } from "../../../../core/modules/Database/databaseTypes";
import { useOpenPlayerModal } from "@/hooks/playerModal";
import DateTimeCorrected from "@/components/DateTimeCorrected";
import { Link } from "lucide-react";
import TxAnchor from "@/components/TxAnchor";



const calcTextAreaLines = (text?: string) => {
    if (!text) return 3;
    const lines = text.trim().split('\n').length + 1;
    return Math.min(Math.max(lines, 3), 16);
}

function ActionReasonBox({ actionReason }: { actionReason: string }) {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [textAreaLines, setTextAreaLines] = useState(calcTextAreaLines(actionReason));

    return <>
        <Label htmlFor="actionReason">
            Reason:
        </Label>
        <Textarea
            ref={textAreaRef}
            id="actionReason"
            className="w-full mt-1"
            readOnly={true}
            value={actionReason}
            //1rem of padding + 1.25rem per line
            style={{ height: `${1 + 1.25 * textAreaLines}rem` }}
        />
    </>
}


type ActionInfoTabProps = {
    action: DatabaseActionType;
    serverTime: number;
    tsFetch: number;
}

export default function ActionInfoTab({ action, serverTime, tsFetch }: ActionInfoTabProps) {
    const openPlayerModal = useOpenPlayerModal();

    let banExpirationText: React.ReactNode;
    if (action.type === 'ban') {
        if (action.expiration === false) {
            banExpirationText = <span className="text-destructive-inline">Never</span>;
        } else if (action.expiration > serverTime) {
            const distance = msToDuration(
                (serverTime - action.expiration) * 1000,
                { units: ['mo', 'w', 'd', 'h', 'm'] }
            )
            banExpirationText = <span className="text-warning-inline">In {distance}</span>;
        } else {
            banExpirationText = <DateTimeCorrected
                className="opacity-75 cursor-help"
                serverTime={serverTime}
                tsObject={action.expiration}
                tsFetch={tsFetch}
            />;
        }
    }

    let warnAckedText: React.ReactNode;
    if (action.type === 'warn' && action.acked) {
        warnAckedText = <span className="opacity-75">Yes</span>;
    } else {
        warnAckedText = <span className="text-warning-inline">Not yet</span>;
    }

    let revokedLabel = 'Revoked';
    let revokedContent: React.ReactNode;
    if (action.revocation.status === 'approved') {
        revokedLabel = 'Revoke Approved';
        const byline = (
            <span>
                By {action.revocation.approver} on <DateTimeCorrected
                    isDateOnly
                    className="cursor-help"
                    serverTime={serverTime}
                    tsObject={action.revocation.timestamp!}
                    tsFetch={tsFetch}
                />
            </span>
        );
        const requestorLine = action.revocation.requestor && (
            <div className="text-xs opacity-75">
                (Requested by {action.revocation.requestor})
            </div>
        );
        const reasonLine = action.revocation.reason && (
            <div className="text-xs opacity-75 mt-1">
                <strong>Reason:</strong> {action.revocation.reason}
            </div>
        );
        revokedContent = <div className="flex flex-col gap-1">{byline}{requestorLine}{reasonLine}</div>

    } else if (action.revocation.status === 'denied') {
        revokedLabel = 'Revoke Denied';
        const byline = (
            <span className="text-destructive-inline">
                By {action.revocation.approver} on <DateTimeCorrected
                    isDateOnly
                    className="cursor-help"
                    serverTime={serverTime}
                    tsObject={action.revocation.timestamp!}
                    tsFetch={tsFetch}
                />
            </span>
        );
        const requestorLine = action.revocation.requestor && (
            <div className="text-xs opacity-75">
                (Requested by {action.revocation.requestor})
            </div>
        );
        const reasonLine = action.revocation.reason && (
            <div className="text-xs opacity-75 mt-1">
                <strong>Reason:</strong> {action.revocation.reason}
            </div>
        );
        revokedContent = <div className="flex flex-col gap-1">{byline}{requestorLine}{reasonLine}</div>

    } else if (action.revocation.status === 'pending') {
        revokedLabel = 'Revoke Pending';
        const requestorLine = (
            <span className="text-warning-inline">
                Requested by {action.revocation.requestor}
            </span>
        );
        const reasonLine = action.revocation.reason && (
            <div className="text-xs opacity-75 mt-1">
                <strong>Reason:</strong> {action.revocation.reason}
            </div>
        );
        revokedContent = <div className="flex flex-col gap-1">{requestorLine}{reasonLine}</div>
    } else { // 'not_revoked'
        revokedContent = <span className="opacity-75">No</span>;
    }

    //Player stuff
    const playerDisplayName = action.playerName !== false
        ? <span>{action.playerName}</span>
        : <span className="italic opacity-75">unknown player</span>;
    const targetLicenses = action.ids.filter(id => id.startsWith('license:'));
    const linkedPlayer = targetLicenses.length === 1 ? targetLicenses[0].split(':')[1] : false;
    const handleViewPlayerClick = () => {
        if (!linkedPlayer) return;
        openPlayerModal({ license: linkedPlayer });
    }

    return <div className="px-1 mb-1 md:mb-4">
        <dl className="pb-2">
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Date/Time</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">
                    <DateTimeCorrected
                        className="opacity-75 cursor-help"
                        serverTime={serverTime}
                        tsObject={action.timestamp}
                        tsFetch={tsFetch}
                    />
                </dd>
            </div>
            {action.type === 'ban' && (
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">Expiration</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">{banExpirationText}</dd>
                </div>
            )}
            {action.type === 'warn' && (
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">Player Accepted</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">{warnAckedText}</dd>
                </div>
            )}
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">{revokedLabel}</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{revokedContent}</dd>
            </div>

            {action.type === 'ban' && action.banApprover && (
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">Approved by (Ban)</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">{action.banApprover}</dd>
                </div>
            )}

            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Admin</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{action.author}</dd>
            </div>
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Player</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{playerDisplayName}</dd>
                <dd className="text-right">
                    <div className="flex flex-row gap-2 justify-end">
                        <Button
                            variant="outline"
                            size='inline'
                            style={{ minWidth: '8.25ch' }}
                            onClick={handleViewPlayerClick}
                            disabled={!linkedPlayer}
                        >View</Button>
                        {action.type === 'wagerblacklist' && (
                            <TxAnchor
                                href={'/server/wager-blacklist'}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2"
                                style={{ minWidth: '8.25ch' }}
                            >
                                <Link className="mr-1 h-4 w-4" />
                                Wager Page
                            </TxAnchor>
                        )}
                    </div>
                </dd>
            </div>
        </dl>

        <ActionReasonBox actionReason={action.reason} />

        {action.type === 'ban' && action.proofs && action.proofs.length > 0 && (
            <div className="mt-4">
                <Label>Proofs:</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                    {action.proofs.map((proof, index) => {
                        const isImage = /\.(jpg|jpeg|png|gif)$/i.test(proof);
                        const isVideo = /\.(mp4|webm|ogg)$/i.test(proof);
                        const isYoutube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/i.test(proof);

                        if (isImage || isVideo) {
                            return (
                                <a
                                    key={index}
                                    href={`/proofs/${proof}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="max-w-xs"
                                >
                                    {isImage ? (
                                        <img src={`/proofs/${proof}`} alt="Proof" className="max-w-full h-auto rounded" />
                                    ) : (
                                        <video src={`/proofs/${proof}`} controls className="max-w-full h-auto rounded" />
                                    )}
                                </a>
                            );
                        } else if (isYoutube) {
                            return (
                                <a
                                    key={index}
                                    href={proof}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    {proof}
                                </a>
                            );
                        } else {
                            return (
                                <a
                                    key={index}
                                    href={proof}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    {proof}
                                </a>
                            );
                        }
                    })}
                </div>
            </div>
        )}
    </div>;
}
