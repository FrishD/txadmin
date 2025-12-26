import { Button } from '@/components/ui/button';
import { HistoryActionModalSuccess } from '@shared/historyApiTypes';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useBackendApi } from '@/hooks/fetch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ActionPcCheckTabProps = {
    action: HistoryActionModalSuccess['action'];
    setModalData: (data: HistoryActionModalSuccess) => void;
};

export default function ActionPcCheckTab({ action, setModalData }: ActionPcCheckTabProps) {
    const [banId, setBanId] = useState('');
    const linkBanApi = useBackendApi({
        method: 'POST',
        path: '/history/linkBan',
    });

    if (action.type !== 'pc_check') {
        return <div className="text-destructive">Invalid action type</div>;
    }

    const handleLinkBan = () => {
        linkBanApi({
            data: { pcCheckId: action.id, banId },
            genericHandler: { successMsg: 'Ban linked successfully.' },
            setData: (data) => {
                setModalData({ action: data.updatedPcCheck });
            }
        });
    };

    return (
        <div className="space-y-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">Supervisor</dt>
                    <dd className="text-sm font-semibold">{action.supervisor}</dd>
                </div>
                
                <div className="space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">Approver</dt>
                    <dd className="text-sm font-semibold">{action.approver}</dd>
                </div>
                
                <div className="space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            action.caught 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                            {action.caught ? 'Caught' : 'Not Caught'}
                        </span>
                    </dd>
                </div>
                
                <div className="space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">Linked Ban</dt>
                    <dd className="text-sm font-semibold">{action.banId || 'N/A'}</dd>
                </div>
            </div>

            {action.proofs.length > 0 && (
                <div className="space-y-3">
                    <dt className="text-sm font-medium text-muted-foreground">Proof Files</dt>
                    <dd className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {action.proofs.map((proof, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                asChild
                                className="justify-start"
                            >
                                <a href={`/proofs/${proof}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Proof {index + 1}
                                </a>
                            </Button>
                        ))}
                    </dd>
                </div>
            )}

            {!action.banId && (
                <div className="space-y-3 pt-4 border-t">
                    <Label htmlFor="linkBanInput" className="text-sm font-medium">
                        Link Ban Manually
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            id="linkBanInput"
                            type="text"
                            value={banId}
                            onChange={(e) => setBanId(e.target.value)}
                            placeholder="Enter ban ID"
                            className="flex-1"
                        />
                        <Button onClick={handleLinkBan} disabled={!banId.trim()}>
                            Link
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}