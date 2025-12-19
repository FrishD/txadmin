import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useBackendApi } from "@/hooks/fetch";
import { useEffect, useState } from "react";
import GenericSpinner from "@/components/GenericSpinner";
import humanizeDuration from "humanize-duration";

//Types
type AdminStatsData = {
    bansGiven: number;
    warnsGiven: number;
    revokeRequested: number;
    revokeApproved: number;
    revokeDenied: number;
    playTime: number;
    tsLastConnection: number;
    discordId: string | null;
}

type AdminStatsModalProps = {
    adminName: string;
    onClose: () => void;
};

const StatRow = ({ label, value }: { label: string, value: string | number }) => (
    <div className="py-1 grid grid-cols-2 gap-4 px-0">
        <dt className="text-sm font-medium leading-6 text-muted-foreground">{label}</dt>
        <dd className="text-sm leading-6 col-span-1 mt-0">{value}</dd>
    </div>
);


export default function AdminStatsModal({ adminName, onClose }: AdminStatsModalProps) {
    const [statsData, setStatsData] = useState<AdminStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const statsApi = useBackendApi<AdminStatsData>({
        method: 'GET',
        path: `/statistics/admin/${adminName}`,
    });

    useEffect(() => {
        statsApi({
            success: (data) => {
                if ('error' in data) {
                    setError(data.error);
                } else {
                    setStatsData(data);
                }
                setLoading(false);
            },
            error: (err) => {
                setError(err);
                setLoading(false);
            }
        });
    }, [adminName]);

    const shortDuration = (d: number) => humanizeDuration(d * 60 * 1000, { round: true, largest: 2 });
    const timeAgo = (ts: number) => {
        if (ts === 0) return 'Never';
        return humanizeDuration(Date.now() - (ts * 1000), { round: true, largest: 1 }) + ' ago';
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Stats for {adminName}</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                    {loading && <GenericSpinner />}
                    {error && <p className="text-destructive-inline">Error: {error}</p>}
                    {statsData && (
                        <dl>
                            <StatRow label="Bans Given:" value={statsData.bansGiven} />
                            <StatRow label="Warns Given:" value={statsData.warnsGiven} />
                            <StatRow label="Revokes Requested:" value={statsData.revokeRequested} />
                            <StatRow label="Revokes Approved:" value={statsData.revokeApproved} />
                            <StatRow label="Revokes Denied:" value={statsData.revokeDenied} />
                            <hr className="my-2" />
                            <StatRow label="Play Time:" value={shortDuration(statsData.playTime)} />
                            <StatRow label="Last Connection:" value={timeAgo(statsData.tsLastConnection)} />
                            <StatRow label="Discord ID:" value={statsData.discordId ?? 'Not linked'} />
                        </dl>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
