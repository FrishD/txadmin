import { Button } from '@/components/ui/button';
import { HistoryActionModalSuccess } from '@shared/historyApiTypes';
import { ExternalLinkIcon } from 'lucide-react';
import { useState } from 'react';
import { useBackendApi } from '@/hooks/fetch';
import { Input } from '@/components/ui/input';

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
        return <div>Invalid action type</div>;
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
        <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-col gap-1">
                <div className="font-bold">Supervisor:</div>
                <div>{action.supervisor}</div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="font-bold">Approver:</div>
                <div>{action.approver}</div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="font-bold">Caught:</div>
                <div>{action.caught ? 'Yes' : 'No'}</div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="font-bold">Proofs:</div>
                <div className="flex flex-col gap-2">
                    {action.proofs.map((proof, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            asChild
                        >
                            <a href={`/proofs/${proof}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLinkIcon className="mr-2 h-4 w-4" />
                                Proof {index + 1}
                            </a>
                        </Button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="font-bold">Linked Ban:</div>
                <div>{action.banId || 'N/A'}</div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="font-bold">Link Ban Manually:</div>
                <div className="flex gap-2">
                    <Input
                        type="text"
                        value={banId}
                        onChange={(e) => setBanId(e.target.value)}
                        placeholder="Enter Ban ID"
                    />
                    <Button onClick={handleLinkBan}>Link</Button>
                </div>
            </div>
        </div>
    );
}
