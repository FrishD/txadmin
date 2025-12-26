import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBackendApi } from '@/hooks/fetch';
import { usePlayerModalStateValue } from '@/hooks/playerModal';
import { GenericApiOkResp } from '@shared/genericApiTypes';
import { FormEvent, useState } from 'react';

export default function PlayerTargetTab() {
    const [reason, setReason] = useState('');
    const { playerRef } = usePlayerModalStateValue();

    const targetApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/player/target',
    });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        targetApi({
            queryParams: playerRef,
            data: { reason },
            genericHandler: { successMsg: 'Player targeted.' },
            toastLoadingMessage: 'Targeting player...',
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                    id="reason"
                    name="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a reason for targeting this player..."
                    className="min-h-[120px] resize-none"
                    required
                />
            </div>
            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" className="px-8">
                    Submit
                </Button>
            </div>
        </form>
    );
}
