import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { useState } from "react";
import { txToast } from "@/components/TxToaster";
import { Heading } from "@medusajs/ui";
import { PlayerSearchResult, PlayerSearchResults } from "@shared/playerApiTypes";
import { useAdminPerms } from "@/hooks/auth";

const PCCheckerPage = () => {
    const { hasPerm } = useAdminPerms();
    const [reports, setReports] = useState<any[]>([]);
    const [player, setPlayer] = useState<PlayerSearchResult | null>(null);
    const [supervisor, setSupervisor] = useState('');
    const [result, setResult] = useState<'passed' | 'not passed'>('passed');
    const [explanation, setExplanation] = useState('');
    const [proofImage, setProofImage] = useState<File | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitReportApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/pc_checker/report',
    });

    const reportsApi = useBackendApi<any[]>({
        method: 'GET',
        path: '/pc_checker/reports',
    });

    const deleteReportApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/pc_checker/delete_report',
    });

    const fetchReports = async () => {
        const resp = await reportsApi({});
        if (resp) {
            setReports(resp);
        }
    };

    useState(() => {
        fetchReports();
    });

    const handleDelete = async (reportId: string) => {
        await deleteReportApi({
            data: { reportId },
            toastLoadingMessage: 'Deleting report...',
            genericHandler: {
                successMsg: 'Report deleted.',
            },
            success: () => {
                fetchReports();
            },
        });
    };

    const handleSubmit = () => {
        if (!player) {
            txToast.warning('You must select a player.');
            return;
        }
        if (!supervisor) {
            txToast.warning('You must select a supervisor.');
            return;
        }
        if (!explanation) {
            txToast.warning('You must provide an explanation.');
            return;
        }
        if (!proofImage) {
            txToast.warning('You must provide a proof image.');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('playerLicense', player.license);
        formData.append('supervisor', supervisor);
        formData.append('result', result);
        formData.append('explanation', explanation);
        formData.append('proofImage', proofImage);

        submitReportApi({
            data: formData,
            toastLoadingMessage: 'Submitting report...',
            genericHandler: {
                successMsg: 'Report submitted.',
            },
            success: () => {
                setIsSubmitting(false);
                setPlayer(null);
                setSupervisor('');
                setResult('passed');
                setExplanation('');
                setProofImage(null);
            },
            error: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <div className="p-4">
            <Heading level="h1">PC Checker</Heading>
            <div className="mt-4 max-w-2xl mx-auto">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="player">Player</Label>
                        <PlayerSearchInput onSelect={setPlayer} />
                    </div>
                    <div>
                        <Label htmlFor="supervisor">Supervisor</Label>
                        <Input id="supervisor" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="result">Result</Label>
                        <Select value={result} onValueChange={(value) => setResult(value as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="passed">Passed</SelectItem>
                                <SelectItem value="not passed">Not Passed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="explanation">Explanation</Label>
                        <Textarea id="explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="proofImage">Proof Image</Label>
                        <Input id="proofImage" type="file" accept="image/*" onChange={(e) => setProofImage(e.target.files ? e.target.files[0] : null)} />
                    </div>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                </div>
            </div>
            <div className="mt-8">
                <Heading level="h2">Reports</Heading>
                <div className="mt-4">
                    <div className="grid grid-cols-6 gap-4 font-bold">
                        <div>Player</div>
                        <div>Reporter</div>
                        <div>Supervisor</div>
                        <div>Result</div>
                        <div>Explanation</div>
                        <div>Actions</div>
                    </div>
                    {reports.map((report) => (
                        <div key={report.id} className="grid grid-cols-6 gap-4 mt-2">
                            <div>{report.playerLicense}</div>
                            <div>{report.reporter}</div>
                            <div>{report.supervisor}</div>
                            <div>{report.result}</div>
                            <div>{report.explanation}</div>
                            <div>
                                {hasPerm('pc.manager') && (
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(report.id)}>
                                        Delete
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PlayerSearchInput = ({ onSelect }: { onSelect: (player: PlayerSearchResult) => void }) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<PlayerSearchResults['players']>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
    const [playerDetails, setPlayerDetails] = useState<any>(null);

    const searchApi = useBackendApi<PlayerSearchResults>({
        method: 'GET',
        path: '/player/search',
    });

    const playerApi = useBackendApi<any>({
        method: 'GET',
        path: '/pc_checker/player',
    });

    const handleSearch = async () => {
        const resp = await searchApi({
            queryParams: {
                searchValue: search,
                searchType: 'playerName',
            },
        });
        if (resp && 'players' in resp) {
            setResults(resp.players);
        }
    };

    const handleSelect = async (player: PlayerSearchResult) => {
        onSelect(player);
        setSelectedPlayer(player);
        const resp = await playerApi({
            queryParams: {
                license: player.license,
            },
        });
        if (resp) {
            setPlayerDetails(resp);
        }
    };

    return (
        <div>
            <div className="flex gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} />
                <Button onClick={handleSearch}>Search</Button>
            </div>
            {selectedPlayer ? (
                <div className="mt-2 space-y-2">
                    <div className="p-2 border rounded-md">
                        <div>
                            <strong>Display Name:</strong> {playerDetails?.displayName}
                        </div>
                        <div>
                            <strong>License:</strong> {playerDetails?.license}
                        </div>
                        <div>
                            <strong>Alternate Accounts:</strong>
                            <ul className="list-disc list-inside">
                                {playerDetails?.ids.map((id: string) => (
                                    <li key={id}>{id}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-2 space-y-2">
                    {results.map((player) => (
                        <div key={player.license} className="p-2 border rounded-md cursor-pointer hover:bg-muted" onClick={() => handleSelect(player)}>
                            {player.displayName}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PCCheckerPage;
