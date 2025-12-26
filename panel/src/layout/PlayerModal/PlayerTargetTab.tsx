import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBackendApi } from '@/hooks/fetch';
import { usePlayerModalStateValue } from '@/hooks/playerModal';
import { GenericApiOkResp } from '@shared/genericApiTypes';
import { PlayerModalPlayerData } from '@shared/playerApiTypes';
import { FormEvent, useState } from 'react';
import { useAdminPerms } from '@/hooks/auth';

type PlayerTargetTabProps = {
    player: PlayerModalPlayerData;
}

export default function PlayerTargetTab({ player }: PlayerTargetTabProps) {
    const [reason, setReason] = useState('');
    const { playerRef } = usePlayerModalStateValue();
    const { admin } = useAdminPerms();

    const targetApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/player/actions',
    });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        targetApi({
            queryParams: { ...playerRef, action: 'target' },
            data: { reason },
            genericHandler: { successMsg: 'Player targeted.' },
            toastLoadingMessage: 'Targeting player...',
        });
    }

    const handleAddMeToo = () => {
        targetApi({
            queryParams: { ...playerRef, action: 'target' },
            data: { reason: 'Added to existing target.' },
            genericHandler: { successMsg: 'Player targeted.' },
            toastLoadingMessage: 'Targeting player...',
        });
    }

    if (player.isTargeted) {
        const isAdminTargeting = player.targetedBy?.includes(admin?.name ?? '');
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Targeted by:</Label>
                    <ul className="list-disc list-inside">
                        {player.targetedBy?.map((adminName) => (
                            <li key={adminName}>{adminName}</li>
                        ))}
                    </ul>
                </div>
                {isAdminTargeting ? (
                    <p className="text-sm text-muted-foreground">You are already targeting this player.</p>
                ) : (
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleAddMeToo} className="px-8">
                            Add me too
                        </Button>
                    </div>
                )}
            </div>
        );
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
