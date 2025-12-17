import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBackendApi } from "@/hooks/fetch";
import { useAdminPerms } from "@/hooks/auth";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { DatabasePCReportType } from "@shared/databaseTypes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ServerPlayer } from "@server/player/playerClasses";


const summonSchema = z.object({
    netid: z.string().min(1, "Required"),
});

const reportSchema = z.object({
    playerLicense: z.string().min(1, "Required"),
    supervisor: z.string().min(1, "Required"),
    result: z.enum(['passed', 'not passed']),
    explanation: z.string().min(1, "Required"),
    proofImage: z.any().refine(file => file instanceof File, "Required"),
});


export default function PCCheckerPage() {
    const { hasPerm } = useAdminPerms();
    const [players, setPlayers] = useState<ServerPlayer[]>([]);
    const [reports, setReports] = useState<DatabasePCReportType[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<ServerPlayer | null>(null);

    const summonApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/pc_checker/summon',
    });

    const reportApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/pc_checker/report',
    });

    const getPlayersApi = useBackendApi<ServerPlayer[]>({
        method: 'GET',
        path: '/player/search',
    });

    const getReportsApi = useBackendApi<DatabasePCReportType[]>({
        method: 'GET',
        path: '/pc_checker/reports',
    });

    useEffect(() => {
        getPlayersApi({
            success: (data) => {
                if (!('error' in data)) {
                    setPlayers(data);
                }
            }
        });
        getReportsApi({
            success: (data) => {
                if (!('error' in data)) {
                    setReports(data);
                }
            }
        });
    }, []);

    const summonForm = useForm<z.infer<typeof summonSchema>>({
        resolver: zodResolver(summonSchema),
    });

    const reportForm = useForm<z.infer<typeof reportSchema>>({
        resolver: zodResolver(reportSchema),
    });

    const handleSummon = async (data: z.infer<typeof summonSchema>) => {
        await summonApi({
            data: { netid: parseInt(data.netid) },
            toastLoadingMessage: 'Summoning player...',
            genericHandler: {
                successMsg: 'Player summoned.',
            },
        });
    };

    const handleReport = async (data: z.infer<typeof reportSchema>) => {
        const formData = new FormData();
        formData.append('playerLicense', data.playerLicense);
        formData.append('supervisor', data.supervisor);
        formData.append('result', data.result);
        formData.append('explanation', data.explanation);
        formData.append('proofImage', data.proofImage);

        await reportApi({
            data: formData,
            toastLoadingMessage: 'Submitting report...',
            genericHandler: {
                successMsg: 'Report submitted.',
            },
        });
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">PC Checker</h1>
            <Tabs defaultValue="summon">
                <TabsList>
                    <TabsTrigger value="summon">Summon Player</TabsTrigger>
                    <TabsTrigger value="report">File Report</TabsTrigger>
                    <TabsTrigger value="reports">View Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="summon">
                    <Card>
                        <CardHeader>
                            <CardTitle>Summon a Player</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...summonForm}>
                                <form onSubmit={summonForm.handleSubmit(handleSummon)} className="space-y-4">
                                    <FormField
                                        control={summonForm.control}
                                        name="netid"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Player</FormLabel>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a player" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {players.map(player => (
                                                                <SelectItem key={player.netid} value={player.netid.toString()}>
                                                                    {player.displayName} ({player.netid})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit">Summon</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="report">
                    <Card>
                        <CardHeader>
                            <CardTitle>File a Report</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...reportForm}>
                                <form onSubmit={reportForm.handleSubmit(handleReport)} className="space-y-4">
                                    <FormField
                                        control={reportForm.control}
                                        name="playerLicense"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Player</FormLabel>
                                                <FormControl>
                                                    <Select onValueChange={(value) => {
                                                        field.onChange(value);
                                                        const player = players.find(p => p.license === value);
                                                        setSelectedPlayer(player || null);
                                                    }} defaultValue={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a player" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {players.map(player => (
                                                                <SelectItem key={player.license} value={player.license}>
                                                                    {player.displayName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {selectedPlayer && (
                                        <div>
                                            <p>Selected Player: {selectedPlayer.displayName}</p>
                                            <p>License: {selectedPlayer.license}</p>
                                        </div>
                                    )}
                                    <FormField
                                        control={reportForm.control}
                                        name="supervisor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Supervisor</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Supervisor's name" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={reportForm.control}
                                        name="result"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Result</FormLabel>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a result" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="passed">Passed</SelectItem>
                                                            <SelectItem value="not passed">Not Passed</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={reportForm.control}
                                        name="explanation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Explanation</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Detailed explanation" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={reportForm.control}
                                        name="proofImage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Proof Image</FormLabel>
                                                <FormControl>
                                                    <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit">Submit Report</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reporter</TableHead>
                                        <TableHead>Player</TableHead>
                                        <TableHead>Supervisor</TableHead>
                                        <TableHead>Result</TableHead>
                                        <TableHead>Date</TableHead>
                                        {hasPerm('pc.manager') && <TableHead>Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reports.map(report => (
                                        <TableRow key={report.id}>
                                            <TableCell>{report.reporter}</TableCell>
                                            <TableCell>{players.find(p => p.license === report.playerLicense)?.displayName || report.playerLicense}</TableCell>
                                            <TableCell>{report.supervisor}</TableCell>
                                            <TableCell>{report.result}</TableCell>
                                            <TableCell>{new Date(report.timestamp * 1000).toLocaleString()}</TableCell>
                                            {hasPerm('pc.manager') && (
                                                <TableCell>
                                                    <Button variant="destructive" size="sm" onClick={async () => {
                                                        await useBackendApi({
                                                            method: 'POST',
                                                            path: '/pc_checker/delete_report',
                                                            data: { reportId: report.id },
                                                        });
                                                        toast.success('Report deleted.');
                                                        setReports(reports.filter(r => r.id !== report.id));
                                                    }}>Delete</Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
