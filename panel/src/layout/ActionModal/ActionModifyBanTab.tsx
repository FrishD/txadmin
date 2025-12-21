import { useState, useRef } from "react";
import type { DatabaseActionType } from "../../../../core/modules/Database/databaseTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { txToast } from "@/components/TxToaster";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { Loader2Icon } from "lucide-react";
import { useBackendApi } from "@/hooks/fetch";
import type { ApiModifyBanReqSchema } from "../../../../core/routes/history/actions";


type ActionModifyBanTabProps = {
    action: DatabaseActionType;
    refreshModalData: () => void;
}

export default function ActionModifyBanTab({ action, refreshModalData }: ActionModifyBanTabProps) {
    const [isModifying, setIsModifying] = useState(false);
    const [currentDuration, setCurrentDuration] = useState('1 day');
    const [customUnits, setCustomUnits] = useState('days');
    const customMultiplierRef = useRef<HTMLInputElement>(null);

    const modifyBanApi = useBackendApi<GenericApiOkResp, ApiModifyBanReqSchema>({
        method: 'POST',
        path: `/history/modifyBan`,
    });

    const doModifyBan = () => {
        let duration;
        if (currentDuration === 'custom') {
            const mult = customMultiplierRef.current?.value;
            if (!mult || !/^\d+$/.test(mult) || parseInt(mult) < 1) {
                txToast.warning('The duration number must be at least 1.');
                return;
            }
            duration = `${mult} ${customUnits}`;
        } else {
            duration = currentDuration;
        }

        setIsModifying(true);
        modifyBanApi({
            data: { actionId: action.id, duration: duration },
            toastLoadingMessage: `Modifying ban...`,
            genericHandler: {
                successMsg: `Ban modified.`,
            },
            success: (data) => {
                setIsModifying(false);
                if ('success' in data) {
                    refreshModalData();
                }
            },
            error: () => {
                setIsModifying(false);
            }
        });
    }

    return (
        <div className="flex flex-col gap-4 px-1 mb-1 md:mb-4">
            <div className="space-y-2">
                <h3 className="text-xl">Modify Ban</h3>
                <p className="text-muted-foreground text-sm">
                    You can change the duration of a ban. The time already served will be discounted from the new duration.
                    For example, if a 4-day ban has 3 days remaining and you change it to a 2-day ban, the new remaining time will be 1 day.
                </p>

                <div className="flex flex-col gap-3">
                    <Label htmlFor="durationSelect">
                        New Duration
                    </Label>
                    <div className="space-y-1">
                        <Select
                            onValueChange={setCurrentDuration}
                            value={currentDuration}
                            disabled={isModifying}
                        >
                            <SelectTrigger id="durationSelect" className="tracking-wide">
                                <SelectValue placeholder="Select Duration" />
                            </SelectTrigger>
                            <SelectContent className="tracking-wide">
                                <SelectItem value="custom" className="font-bold">Custom (set below)</SelectItem>
                                <SelectItem value="2 hours">2 HOURS</SelectItem>
                                <SelectItem value="8 hours">8 HOURS</SelectItem>
                                <SelectItem value="1 day">1 DAY</SelectItem>
                                <SelectItem value="2 days">2 DAYS</SelectItem>
                                <SelectItem value="3 days">3 DAYS</SelectItem>
                                <SelectItem value="4 days">4 DAYS</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex flex-row gap-2">
                            <Input
                                id="durationMultiplier"
                                type="number"
                                placeholder="12"
                                required
                                disabled={currentDuration !== 'custom' || isModifying}
                                ref={customMultiplierRef}
                            />
                            <Select
                                onValueChange={setCustomUnits}
                                value={customUnits}
                                disabled={currentDuration !== 'custom' || isModifying}
                            >
                                <SelectTrigger
                                    className="tracking-wide"
                                    id="durationUnits"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="tracking-wide">
                                    <SelectItem value="hours">HOURS</SelectItem>
                                    <SelectItem value="days">DAYS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <Button
                    variant="destructive"
                    size='xs'
                    className="col-start-1 col-span-full xs:col-span-3 xs:col-start-2"
                    type="submit"
                    disabled={isModifying}
                    onClick={doModifyBan}
                >
                    {isModifying ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Modifying...
                        </span>
                    ) : 'Modify Ban'}
                </Button>
            </div>
        </div>
    );
}
