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
import { FormEvent, useEffect, useState } from 'react';
import { usePlayerModalStateValue } from '@/hooks/playerModal';
import { GenericApiOkResp } from '@shared/genericApiTypes';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X } from 'lucide-react';

export default function PlayerPcCheckTab() {
    const [caught, setCaught] = useState('');
    const [supervisor, setSupervisor] = useState<string | undefined>(undefined);
    const [approver, setApprover] = useState<string | undefined>(undefined);
    const [reason, setReason] = useState('');
    const [proofs, setProofs] = useState<FileList | null>(null);
    const [approvers, setApprovers] = useState<string[]>();
    const [supervisors, setSupervisors] = useState<string[]>();
    const { playerRef } = usePlayerModalStateValue();

    const pcCheckApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/player/pc_check',
    });

    const getApproversApi = useBackendApi<string[]>({
        method: 'GET',
        path: '/adminManager/getApprovers',
    });

    useEffect(() => {
        getApproversApi({}).then((data) => {
            if (data) {
                setApprovers(data);
                setSupervisors(data);
                
                // אם יש רק approver אחד, בחר אותו אוטומטית
                if (data.length === 1) {
                    setApprover(data[0]);
                }
            }
        });
    }, []);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('caught', caught);
        formData.append('supervisor', supervisor || '');
        formData.append('approver', approver || '');
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProofs(e.target.files);
    };

    const clearFiles = () => {
        setProofs(null);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="caught">Status</Label>
                    <Select name="caught" onValueChange={setCaught} required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">Caught</SelectItem>
                            <SelectItem value="false">Not Caught</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Staff Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="supervisor">
                        Supervisor
                        {supervisors && supervisors.length === 1 && (
                            <span className="text-xs text-muted-foreground ml-2">(Auto-selected)</span>
                        )}
                    </Label>
                    <Select 
                        onValueChange={setSupervisor} 
                        value={supervisor ?? ''} 
                        required
                        disabled={supervisors?.length === 1}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                            {!supervisors ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : supervisors.length ? (
                                supervisors.map((admin) => (
                                    <SelectItem key={admin} value={admin}>
                                        {admin}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>
                                    No admins with required permissions found.
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="approver">
                        Approver
                        {approvers && approvers.length === 1 && (
                            <span className="text-xs text-muted-foreground ml-2">(Auto-selected)</span>
                        )}
                    </Label>
                    <Select
                        value={approver ?? ''}
                        onValueChange={setApprover}
                        required
                        disabled={approvers?.length === 1}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select approver" />
                        </SelectTrigger>
                        <SelectContent>
                            {!approvers ? (
                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : approvers.length ? (
                                approvers.map((admin) => (
                                    <SelectItem key={admin} value={admin}>
                                        {admin}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>
                                    No admins with required permissions found.
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Proof Section */}
            {window.txConsts.isProofsEnabled && (
                <div className="space-y-2">
                    <Label htmlFor="proof">Proof Files</Label>
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="file"
                                id="proof"
                                name="proofs"
                                multiple
                                accept="image/png, image/jpeg"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <label
                                htmlFor="proof"
                                className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors hover:border-primary hover:bg-accent/50"
                            >
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <div className="text-sm">
                                        <span className="font-semibold text-primary">Click to upload</span>
                                        <span className="text-muted-foreground"> or drag and drop</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        PNG or JPEG (Multiple files allowed)
                                    </p>
                                </div>
                            </label>
                        </div>
                        
                        {proofs && proofs.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">
                                        {proofs.length} file{proofs.length > 1 ? 's' : ''} selected
                                    </p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFiles}
                                        className="h-8 text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Clear
                                    </Button>
                                </div>
                                <div className="space-y-1">
                                    {Array.from(proofs).map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 px-3 py-2 text-sm bg-accent rounded-md"
                                        >
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                            <span className="flex-1 truncate">{file.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reason Section */}
            <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                    id="reason"
                    name="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide detailed reason for the PC check..."
                    className="min-h-[120px] resize-none"
                    required
                />
            </div>

            {/* Submit Section */}
            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" className="px-8">
                    Submit Report
                </Button>
            </div>
        </form>
    );
}