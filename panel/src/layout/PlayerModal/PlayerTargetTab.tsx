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
        path: '/player/actions/target',
    });

    const untargetApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/player/actions/untarget',
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

    const handleUntarget = () => {
        untargetApi({
            queryParams: playerRef,
            genericHandler: { successMsg: 'Player untargeted.' },
            toastLoadingMessage: 'Untargeting player...',
        });
    }

    const handleAddMeToo = () => {
        targetApi({
            queryParams: playerRef,
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
                <div className="flex justify-end pt-4 border-t space-x-2">
                    <Button onClick={handleUntarget} className="px-8" variant="destructive">
                        Untarget
                    </Button>
                    {!isAdminTargeting && (
                        <Button onClick={handleAddMeToo} className="px-8">
                            Add me too
                        </Button>
                    )}
                </div>
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
