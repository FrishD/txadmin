import { Button } from '@/components/ui/button';
import { HistoryActionModalSuccess } from '@shared/historyApiTypes';
import { ExternalLinkIcon } from 'lucide-react';
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
        return <div>סוג פעולה לא חוקי</div>;
    }

    const handleLinkBan = () => {
        linkBanApi({
            data: { pcCheckId: action.id, banId },
            genericHandler: { successMsg: 'באן קושר בהצלחה.' },
            setData: (data) => {
                setModalData({ action: data.updatedPcCheck });
            }
        });
    };

    return (
        <div className="px-1 mb-1 md:mb-4">
            <dl className="space-y-4">
                <div>
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">בודק:</dt>
                    <dd className="mt-1 text-sm leading-6">{action.supervisor}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">מאשר:</dt>
                    <dd className="mt-1 text-sm leading-6">{action.approver}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">נתפס:</dt>
                    <dd className="mt-1 text-sm leading-6">{action.caught ? 'כן' : 'לא'}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">הוכחות:</dt>
                    <dd className="mt-2 space-y-2">
                        {action.proofs.map((proof, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                asChild
                                className="w-full justify-start"
                            >
                                <a href={`/proofs/${proof}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLinkIcon className="mr-2 h-4 w-4" />
                                    הוכחה {index + 1}
                                </a>
                            </Button>
                        ))}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">באן מקושר:</dt>
                    <dd className="mt-1 text-sm leading-6">{action.banId || 'N/A'}</dd>
                </div>
                {!action.banId && (
                    <div>
                        <Label htmlFor="linkBanInput" className="text-sm font-medium leading-6 text-muted-foreground">קשר באן ידנית:</Label>
                        <div className="mt-2 flex gap-2">
                            <Input
                                id="linkBanInput"
                                type="text"
                                value={banId}
                                onChange={(e) => setBanId(e.target.value)}
                                placeholder="הכנס מזהה באן"
                            />
                            <Button onClick={handleLinkBan}>קשר</Button>
                        </div>
                    </div>
                )}
            </dl>
        </div>
    );
}
