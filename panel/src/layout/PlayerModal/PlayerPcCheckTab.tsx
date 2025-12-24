import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useBackendApi } from '@/hooks/fetch';
import { FormEvent, useState } from 'react';
import { usePlayerModalStateValue } from '@/hooks/playerModal';
import { GenericApiOkResp } from '@shared/genericApiTypes';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function PlayerPcCheckTab() {
    const [caught, setCaught] = useState('');
    const [supervisor, setSupervisor] = useState('');
    const [approver, setApprover] = useState('');
    const [reason, setReason] = useState('');
    const [proofs, setProofs] = useState<FileList | null>(null);
    const { playerRef } = usePlayerModalStateValue();

    const pcCheckApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/player/pc_check',
    });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('caught', caught);
        formData.append('supervisor', supervisor);
        formData.append('approver', approver);
        formData.append('reason', reason);
        if (proofs) {
            for (let i = 0; i < proofs.length; i++) {
                formData.append('proofs', proofs[i]);
            }
        }

        pcCheckApi({
            queryParams: playerRef,
            data: formData,
            genericHandler: { successMsg: 'PC Check report submitted.' },
            toastLoadingMessage: 'Submitting PC Check report...',
        });
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="caught" className="text-right">
                        Caught
                    </Label>
                    <Select name="caught" onValueChange={setCaught}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">Caught</SelectItem>
                            <SelectItem value="false">Not Caught</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="supervisor" className="text-right">
                        Supervisor
                    </Label>
                    <Input
                        id="supervisor"
                        value={supervisor}
                        onChange={(e) => setSupervisor(e.target.value)}
                        className="col-span-3"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="approver" className="text-right">
                        Approver
                    </Label>
                    <Input
                        id="approver"
                        value={approver}
                        onChange={(e) => setApprover(e.target.value)}
                        className="col-span-3"
                    />
                </div>
                {window.txConsts.isProofsEnabled && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="proof" className="text-right">
                            Proof
                        </Label>
                        <input
                            type="file"
                            name="proofs"
                            multiple
                            accept="image/png, image/jpeg"
                            className="col-span-3"
                            onChange={(e) => setProofs(e.target.files)}
                        />
                    </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reason" className="text-right">
                        Reason
                    </Label>
                    <Textarea
                        name="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="col-span-3"
                        required
                    />
                </div>
            </div>
            <Button type="submit">Submit</Button>
        </form>
    );
}
