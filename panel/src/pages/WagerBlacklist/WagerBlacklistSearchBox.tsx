import { throttle } from "throttle-debounce";
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import InlineCode from '@/components/InlineCode';
import { useEventListener } from "usehooks-ts";

export const availableSearchTypes = [
    {
        value: 'playerName',
        label: 'Player Name',
        placeholder: 'Enter a player name to search for',
        description: 'Search by player name.'
    },
    {
        value: 'identifiers',
        label: 'Player IDs',
        placeholder: 'License, Discord, Steam, etc.',
        description: 'Search by player IDs separated by a comma.'
    },
] as const;

export const throttleFunc = throttle(1250, (func: any) => {
    func();
}, { noLeading: true });

export type WagerBlacklistSearchBoxReturnStateType = {
    value: string;
    type: string;
}

type WagerBlacklistSearchBoxProps = {
    doSearch: (search: WagerBlacklistSearchBoxReturnStateType) => void;
};

export function WagerBlacklistSearchBox({ doSearch }: WagerBlacklistSearchBoxProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isSearchTypeDropdownOpen, setSearchTypeDropdownOpen] = useState(false);
    const [currSearchType, setCurrSearchType] = useState<string>(availableSearchTypes[0].value);
    const [hasSearchText, setHasSearchText] = useState(false);

    const updateSearch = () => {
        if (!inputRef.current) return;
        const searchValue = inputRef.current.value.trim();
        doSearch({ value: searchValue, type: currSearchType });
    }

    useEffect(() => {
        updateSearch();
    }, [currSearchType]);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            throttleFunc.cancel({ upcomingOnly: true });
            updateSearch();
        } else if (e.key === 'Escape') {
            inputRef.current!.value = '';
            throttleFunc(updateSearch);
            setHasSearchText(false);
        } else {
            throttleFunc(updateSearch);
            setHasSearchText(true);
        }
    };

    const clearSearchBtn = () => {
        inputRef.current!.value = '';
        throttleFunc.cancel({ upcomingOnly: true });
        updateSearch();
        setHasSearchText(false);
    };

    useEventListener('keydown', (e: KeyboardEvent) => {
        if (e.code === 'KeyF' && (e.ctrlKey || e.metaKey)) {
            inputRef.current?.focus();
            e.preventDefault();
        }
    });

    const selectedSearchType = availableSearchTypes.find((type) => type.value === currSearchType);
    if (!selectedSearchType) throw new Error(`Invalid search type: ${currSearchType}`);

    return (
        <div className="p-4 mb-2 md:mb-4 md:rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-wrap-reverse gap-2">
                <div className='relative min-w-44 grow'>
                    <Input
                        type="text"
                        autoFocus
                        autoCapitalize='off'
                        autoCorrect='off'
                        ref={inputRef}
                        placeholder={selectedSearchType.placeholder}
                        onKeyDown={handleInputKeyDown}
                    />
                    {hasSearchText ? (
                        <button
                            className="absolute right-2 inset-y-0 text-zinc-500 dark:text-zinc-400 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                            onClick={clearSearchBtn}
                        >
                            <XIcon />
                        </button>
                    ) : (
                        <div className="absolute right-2 inset-y-0 flex items-center text-zinc-500 dark:text-zinc-400 select-none pointer-events-none">
                            <InlineCode className="text-xs tracking-wide">ctrl+f</InlineCode>
                        </div>
                    )}
                </div>

                <div className="grow flex content-start gap-2 flex-wrap">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isSearchTypeDropdownOpen}
                                onClick={() => setSearchTypeDropdownOpen(!isSearchTypeDropdownOpen)}
                                className="xs:w-48 justify-between border-input bg-black/5 dark:bg-black/30 hover:dark:bg-primary grow md:grow-0"
                            >
                                Search by {selectedSearchType.label}
                                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='w-48'>
                            <DropdownMenuLabel>Search Type</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={currSearchType} onValueChange={setCurrSearchType}>
                                {availableSearchTypes.map((searchType) => (
                                    <DropdownMenuRadioItem
                                        key={searchType.value}
                                        value={searchType.value}
                                        className='cursor-pointer'
                                    >
                                        {searchType.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1 px-1">
                {selectedSearchType.description}
            </div>
        </div>
    )
}
