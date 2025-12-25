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
            <dl className="pb-2">
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">בודק:</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">{action.supervisor}</dd>
                </div>
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">מאשר:</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">{action.approver}</dd>
                </div>
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">נתפס:</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">{action.caught ? 'כן' : 'לא'}</dd>
                </div>
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">הוכחות:</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">
                        <div className="flex flex-col gap-2">
                            {action.proofs.map((proof, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    asChild
                                >
                                    <a href={`/proofs/${proof}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLinkIcon className="mr-2 h-4 w-4" />
                                        הוכחה {index + 1}
                                    </a>
                                </Button>
                            ))}
                        </div>
                    </dd>
                </div>
                <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                    <dt className="text-sm font-medium leading-6 text-muted-foreground">באן מקושר:</dt>
                    <dd className="text-sm leading-6 col-span-2 mt-0">{action.banId || 'N/A'}</dd>
                </div>
                {!action.banId && (
                    <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                        <dt className="text-sm font-medium leading-6 text-muted-foreground">קשר באן ידנית:</dt>
                        <dd className="text-sm leading-6 col-span-2 mt-0">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    value={banId}
                                    onChange={(e) => setBanId(e.target.value)}
                                    placeholder="הכנס מזהה באן"
                                />
                                <Button onClick={handleLinkBan}>קשר</Button>
                            </div>
                        </dd>
                    </div>
                )}
            </dl>
        </div>
    );
}
