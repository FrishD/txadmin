import { useEffect, useState } from 'react';
import { GavelIcon } from 'lucide-react';
import PageCalloutRow, { PageCalloutProps } from '@/components/PageCalloutRow';
import { useBackendApi } from '@/hooks/fetch';
import { WagerBlacklistStatsResp } from '@shared/wagerBlacklistApiTypes';

export default function WagerBlacklistStats() {
    const [statsData, setStatsData] = useState<WagerBlacklistStatsResp | undefined>(undefined);
    const statsApi = useBackendApi<WagerBlacklistStatsResp>({
        method: 'GET',
        path: '/wagerblacklist/stats',
        abortOnUnmount: true,
    });

    useEffect(() => {
        statsApi({
            success: (data) => {
                setStatsData(data);
            },
        });
    }, []);

    const calloutRowData: PageCalloutProps[] = [
        {
            label: 'Total W.Blacklists',
            value: statsData && 'total' in statsData ? statsData.total : false,
            icon: <GavelIcon />,
        },
        {
            label: 'Active W.Blacklists',
            value: statsData && 'active' in statsData ? statsData.active : false,
            icon: <GavelIcon />,
        },
        {
            label: 'Total Revokes',
            value: statsData && 'revoked' in statsData ? statsData.revoked : false,
            icon: <GavelIcon />,
        },
        {
            label: 'New W.Blacklists Last 7D',
            value: statsData && 'last7days' in statsData ? statsData.last7days : false,
            icon: <GavelIcon />,
            prefix: '+',
        },
    ];

    return <PageCalloutRow callouts={calloutRowData} />;
}
