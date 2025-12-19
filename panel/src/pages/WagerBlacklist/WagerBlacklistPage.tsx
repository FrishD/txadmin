import { memo, useState } from 'react';
import WagerBlacklistTable from './WagerBlacklistTable';
import { WagerBlacklistSearchBox, WagerBlacklistSearchBoxReturnStateType } from './WagerBlacklistSearchBox';
import WagerBlacklistStats from './WagerBlacklistStats';

const WagerBlacklistTableMemo = memo(WagerBlacklistTable);
const WagerBlacklistSearchBoxMemo = memo(WagerBlacklistSearchBox);
const WagerBlacklistStatsMemo = memo(WagerBlacklistStats);

export default function WagerBlacklistPage() {
    const [search, setSearch] = useState<WagerBlacklistSearchBoxReturnStateType>({ value: '', type: 'playerName' });

    return (<div
        className='flex flex-col min-w-96 w-full h-contentvh'
    >
        <WagerBlacklistStatsMemo />
        <WagerBlacklistSearchBoxMemo doSearch={setSearch} />
        <WagerBlacklistTableMemo search={search} />
    </div>);
}
