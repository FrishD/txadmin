import { PlayerModalSuccessPlayer, MuteStatusType } from '@shared/playerApiTypes';
import { useBackendApi } from '@/hooks/fetch';
import { Button, Text, Textarea, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { z } from 'zod';
import { zodResolver, useForm } from '@mantine/form';


const formSchema = z.object({
    duration: z.string().trim().min(1, { message: 'Duration is required' }),
    reason: z.string().trim(),
});

interface PlayerMuteTabProps {
    player: PlayerModalSuccessPlayer;
    refreshData: () => void;
}

export default function PlayerMuteTab({ player, refreshData }: PlayerMuteTabProps) {
    const { post } = useBackendApi();
    const muteStatus = player.muteStatus;

    //Form stuff
    const form = useForm({
        validate: zodResolver(formSchema),
        initialValues: {
            duration: '1h',
            reason: '',
        },
    });
    const handleMuteSubmit = async (values: typeof form.values) => {
        if (!player.license) return;
        try {
            const res = await post(`/player/mute?license=${player.license}`, {
                duration: values.duration,
                reason: values.reason,
            });
            if (res.success) {
                showNotification({
                    title: 'Success',
                    message: 'Player muted.',
                    color: 'green',
                });
                refreshData();
            } else {
                showNotification({
                    title: 'Error',
                    message: res.error,
                    color: 'red',
                });
            }
        } catch (e) {
            console.error(e);
            showNotification({
                title: 'Error',
                message: 'Failed to mute player.',
                color: 'red',
            });
        }
    }


    //Unmute handler
    const handleUnmute = async () => {
        if (!player.license) return;
        try {
            const res = await post(`/player/unmute?license=${player.license}`);
            if (res.success) {
                showNotification({
                    title: 'Success',
                    message: 'Player unmuted.',
                    color: 'green',
                });
                refreshData();
            } else {
                showNotification({
                    title: 'Error',
                    message: res.error,
                    color: 'red',
                });
            }
        } catch (e) {
            console.error(e);
            showNotification({
                title: 'Error',
                message: 'Failed to unmute player.',
                color: 'red',
            });
        }
    }


    if (player.isOffline) {
        return (
            <Text p="md" align="center" color="dimmed" size="sm">
                This player is offline.
            </Text>
        )
    }

    if (muteStatus) {
        const expirationString = muteStatus.expiration
            ? new Date(muteStatus.expiration * 1000).toLocaleString()
            : 'Permanent';
        return (
            <div className="p-4 space-y-4">
                <Text size="sm">
                    This player is currently muted.
                </Text>
                <Text size="sm"><strong>Muter:</strong> {muteStatus.author}</Text>
                <Text size="sm"><strong>Reason:</strong> {muteStatus.reason}</Text>
                <Text size="sm"><strong>Expires:</strong> {expirationString}</Text>
                <Button fullWidth color="red" onClick={handleUnmute}>
                    Unmute Player
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={form.onSubmit(handleMuteSubmit)} className="p-4 space-y-4">
            <TextInput
                required
                label="Duration"
                placeholder="ex: 1h, 2d, permanent"
                {...form.getInputProps('duration')}
            />
            <Textarea
                label="Reason (optional)"
                placeholder="Reason for mute..."
                minRows={2}
                {...form.getInputProps('reason')}
            />
            <Button fullWidth type="submit">
                Mute Player
            </Button>
        </form>
    );
}