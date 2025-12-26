import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useBackendApi } from '@/hooks/fetch';
import { useAdminPerms } from '@/hooks/auth';
import { useOpenPromptDialog } from '@/hooks/dialogs';
import { WagerBlacklistActionType } from '@shared/wagerBlacklistApiTypes';
import { convertRowDateTime } from '@/lib/dateTime';
import { GavelIcon } from 'lucide-react';


import { WagerBlacklistSearchBoxReturnStateType } from "./WagerBlacklistSearchBox";

type WagerBlacklistTableProps = {
    search: WagerBlacklistSearchBoxReturnStateType;
}

export default function WagerBlacklistTable({ search }: WagerBlacklistTableProps) {
    const { hasPerm } = useAdminPerms();
    const [wagerBlacklist, setWagerBlacklist] = useState<WagerBlacklistActionType[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const listApi = useBackendApi<WagerBlacklistActionType[]>({
        method: 'GET',
        path: '/wagerblacklist/list',
    });
    const revokeApi = useBackendApi({
        method: 'POST',
        path: '/wagerblacklist/revoke',
    });
    const openPromptDialog = useOpenPromptDialog();

    const fetchWagerBlacklist = async () => {
        const resp = await listApi({
            queryParams: search,
        });
        if (resp && !('error' in resp)) {
            setWagerBlacklist(resp);
        } else {
            setLoadError(resp?.error ?? 'Failed to fetch wager blacklist.');
        }
    };

    useEffect(() => {
        fetchWagerBlacklist();
    }, [search]);

    const handleRevoke = (actionId: string) => {
        openPromptDialog({
            title: 'Revoke Wager Blacklist',
            message: 'Enter a reason for revoking this wager blacklist.',
            placeholder: 'Reason...',
            required: true,
            onSubmit: async (reason) => {
                const resp = await revokeApi({
                    data: {
                        actionId,
                        reason,
                    }
                });
                if (resp && !('error' in resp)) {
                    fetchWagerBlacklist();
                } else {
                    //TODO: show error toast
                    console.error(resp?.error ?? 'Failed to revoke wager blacklist.');
                }
            }
        });
    };

    return (
        <div className="w-full max-h-full min-h-96 overflow-auto border md:rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {wagerBlacklist.map((action) => (
                        <TableRow key={action.id}>
                            <TableCell>{action.playerName || 'N/A'}</TableCell>
                            <TableCell>{action.author}</TableCell>
                            <TableCell>{action.reason}</TableCell>
                            <TableCell>{convertRowDateTime(action.timestamp)}</TableCell>
                            <TableCell>
                                <Button variant="destructive" onClick={() => handleRevoke(action.id)} disabled={!hasPerm('wager.head')}>
                                    <GavelIcon className="mr-2 h-4 w-4" /> Revoke
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {loadError && <div className="text-red-500 p-4">{loadError}</div>}
        </div>
    );
}
