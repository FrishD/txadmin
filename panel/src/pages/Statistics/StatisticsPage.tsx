import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GavelIcon, AlertTriangleIcon } from "lucide-react";
import { useBackendApi } from '@/hooks/fetch';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import humanizeDuration from 'humanize-duration';
import GenericSpinner from '@/components/GenericSpinner';
import ModalCentralMessage from '@/components/ModalCentralMessage';
import AdminStatsModal from './AdminStatsModal';

// Define types for stats data
type LeaderboardAdmin = {
    name: string;
    playTime: number;
    tsLastConnection: number;
    bansGiven: number;
    warnsGiven: number;
    revokeRequested: number;
    revokeApproved: number;
    revokeDenied: number;
}
type StatsDataType = {
    activeBans: number;
    bansGiven: number;
    warnsGiven: number;
    leaderboardData: LeaderboardAdmin[];
};

const StatisticsPage = () => {
    const [statsData, setStatsData] = useState<StatsDataType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [adminSearch, setAdminSearch] = useState('');
    const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
    const statsApi = useBackendApi<StatsDataType>({
        method: 'GET',
        path: '/statistics/all',
    });

    const fetchData = () => {
        setLoading(true);
        statsApi({
            success: (data) => {
                if ('error' in data) {
                    setError(data.error);
                } else {
                    setStatsData(data);
                }
                setLoading(false);
            },
            error: (err) => {
                setError(err);
                setLoading(false);
            }
        });
    };

    useEffect(() => {
        fetchData();
    }, []); //Initial fetch

    const filteredLeaderboardData = useMemo(() => {
        if (!statsData) return [];
        let filtered = statsData.leaderboardData;

        if (adminSearch) {
            filtered = filtered.filter(admin =>
                admin.name.toLowerCase().includes(adminSearch.toLowerCase())
            );
        }

        return filtered;
    }, [statsData, adminSearch]);

    if (loading) {
        return <GenericSpinner />;
    }
    if (error) {
        return <ModalCentralMessage>Error: {error}</ModalCentralMessage>;
    }
    if (!statsData) {
        return <ModalCentralMessage>No data available.</ModalCentralMessage>;
    }

    const shortDuration = (d: number) => humanizeDuration(d * 60 * 1000, { round: true, largest: 2 });
    const timeAgo = (ts: number) => {
        if (ts === 0) return 'Never';
        return humanizeDuration(Date.now() - (ts * 1000), { round: true, largest: 1 }) + ' ago';
    }

    return (
        <div className="w-full p-4 md:p-6 space-y-6">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-4xl font-bold tracking-tight">Statistics</h1>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search Admins"
                        className="max-w-xs"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                    />
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Active Bans</CardTitle>
                        <GavelIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{statsData.activeBans}</p>
                        <p className="text-xs text-muted-foreground">Currently active bans</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Bans Given</CardTitle>
                        <GavelIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{statsData.bansGiven}</p>
                        <p className="text-xs text-muted-foreground">in selected period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Warns Given</CardTitle>
                        <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{statsData.warnsGiven}</p>
                        <p className="text-xs text-muted-foreground">in selected period</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Admin Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Admin</TableHead>
                                <TableHead>Bans</TableHead>
                                <TableHead>Warns</TableHead>
                                <TableHead>Revokes Req.</TableHead>
                                <TableHead>Revokes Appr.</TableHead>
                                <TableHead>Revokes Den.</TableHead>
                                <TableHead>Play Time</TableHead>
                                <TableHead>Last Connection</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLeaderboardData.map(admin => (
                                <TableRow
                                    key={admin.name}
                                    className="even:bg-muted/40 cursor-pointer hover:bg-muted"
                                    onClick={() => setSelectedAdmin(admin.name)}
                                >
                                    <TableCell>{admin.name}</TableCell>
                                    <TableCell>{admin.bansGiven}</TableCell>
                                    <TableCell>{admin.warnsGiven}</TableCell>
                                    <TableCell>{admin.revokeRequested}</TableCell>
                                    <TableCell>{admin.revokeApproved}</TableCell>
                                    <TableCell>{admin.revokeDenied}</TableCell>
                                    <TableCell>{shortDuration(admin.playTime)}</TableCell>
                                    <TableCell>{timeAgo(admin.tsLastConnection)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedAdmin && (
                <AdminStatsModal
                    adminName={selectedAdmin}
                    onClose={() => setSelectedAdmin(null)}
                />
            )}
        </div>
    );
};

export default StatisticsPage;