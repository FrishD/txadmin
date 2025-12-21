import React, { useEffect, useState } from "react";
import {
  Button,
  DialogContent,
  MenuItem,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { useAssociatedPlayerValue } from "../../../state/playerDetails.state";
import { fetchWebPipe } from "../../../utils/fetchWebPipe";
import { useSnackbar } from "notistack";
import { useTranslate } from "react-polyglot";
import { usePlayerModalContext } from "../../../provider/PlayerModalProvider";
import { userHasPerm } from "../../../utils/miscUtils";
import { usePermissionsValue } from "../../../state/permissions.state";
import { DialogLoadError } from "./DialogLoadError";
import { GenericApiErrorResp, GenericApiResp } from "@shared/genericApiTypes";
import { useSetPlayerModalVisibility } from "@nui/src/state/playerModal.state";
import { PlayerHistoryItem } from "@shared/playerApiTypes";

const DialogMuteView: React.FC = () => {
  const assocPlayer = useAssociatedPlayerValue();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("1 hour");
  const [customDuration, setCustomDuration] = useState("hours");
  const [customDurLength, setCustomDurLength] = useState("1");
  const t = useTranslate();
  const setModalOpen = useSetPlayerModalVisibility();
  const { enqueueSnackbar } = useSnackbar();
  const { showNoPerms } = usePlayerModalContext();
  const playerPerms = usePermissionsValue();
  const [muteStatus, setMuteStatus] = useState<PlayerHistoryItem | null>(null);

  useEffect(() => {
    if (assocPlayer) {
      // This is a placeholder. In a real scenario, you'd fetch this from the player details state.
      // For now, we'll just check the history for an active mute.
      const activeMute = (assocPlayer as any).actionHistory?.find(
        (a: PlayerHistoryItem) => a.type === 'mute' && !a.revokedAt
      );
      setMuteStatus(activeMute || null);
    }
  }, [assocPlayer]);

  if (typeof assocPlayer !== "object") {
    return <DialogLoadError />;
  }

  const handleMute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userHasPerm("players.mute", playerPerms)) return showNoPerms("Mute");

    const trimmedReason = reason.trim();
    if (!trimmedReason.length) {
      enqueueSnackbar("Reason is required.", { variant: "error" });
      return;
    }

    const actualDuration = duration === "custom"
      ? `${customDurLength} ${customDuration}`
      : duration;

    fetchWebPipe<GenericApiResp>(
      `/player/mute?mutex=current&netid=${assocPlayer.id}`,
      {
        method: "POST",
        data: {
          reason: trimmedReason,
          duration: actualDuration,
        },
      }
    )
      .then((result) => {
        if ("success" in result && result.success) {
          setModalOpen(false);
          enqueueSnackbar("Player muted successfully.", { variant: "success" });
        } else {
          enqueueSnackbar(
            (result as GenericApiErrorResp).error ?? t("nui_menu.misc.unknown_error"),
            { variant: "error" }
          );
        }
      })
      .catch((error) => {
        enqueueSnackbar((error as Error).message, { variant: "error" });
      });
  };

  const handleUnmute = () => {
    if (!userHasPerm("players.mute", playerPerms)) return showNoPerms("Unmute");

    fetchWebPipe<GenericApiResp>(
      `/player/unmute?mutex=current&netid=${assocPlayer.id}`,
      {
        method: "POST",
      }
    )
      .then((result) => {
        if ("success" in result && result.success) {
          setModalOpen(false);
          enqueueSnackbar("Player unmuted successfully.", { variant: "success" });
        } else {
          enqueueSnackbar(
            (result as GenericApiErrorResp).error ?? t("nui_menu.misc.unknown_error"),
            { variant: "error" }
          );
        }
      })
      .catch((error) => {
        enqueueSnackbar((error as Error).message, { variant: "error" });
      });
  };

  const muteDurations = [
    { value: "5 minutes", label: "5 Minutes" },
    { value: "30 minutes", label: "30 Minutes" },
    { value: "1 hour", label: "1 Hour" },
    { value: "8 hours", label: "8 Hours" },
    { value: "1 day", label: "1 Day" },
    { value: "3 days", label: "3 Days" },
    { value: "custom", label: "Custom" },
  ];

  const customMuteLength = [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
  ];

  if (muteStatus) {
    const expirationTime = muteStatus.exp ? new Date(muteStatus.exp * 1000).toLocaleString() : 'Permanent';
    return (
      <DialogContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Mute Status
        </Typography>
        <Typography>
          Player is currently muted by <strong>{muteStatus.author}</strong>.
        </Typography>
        <Typography>
          Reason: <strong>{muteStatus.reason}</strong>
        </Typography>
        <Typography>
          Expires: <strong>{expirationTime}</strong>
        </Typography>
        <Button
          variant="contained"
          color="success"
          sx={{ mt: 2 }}
          onClick={handleUnmute}
        >
          Unmute
        </Button>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Mute Player
      </Typography>
      <form onSubmit={handleMute}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          size="small"
          select
          required
          label="Duration"
          variant="outlined"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          fullWidth
        >
          {muteDurations.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        {duration === "custom" && (
          <Box display="flex" alignItems="stretch" gap={1} sx={{ mt: 2 }}>
            <TextField
              type="number"
              placeholder="1"
              variant="outlined"
              size="small"
              value={customDurLength}
              onChange={(e) => setCustomDurLength(e.target.value)}
            />
            <TextField
              select
              variant="outlined"
              size="small"
              fullWidth
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
            >
              {customMuteLength.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}
        <Button
          variant="contained"
          type="submit"
          color="error"
          sx={{ mt: 2 }}
        >
          Mute Player
        </Button>
      </form>
    </DialogContent>
  );
};

export default DialogMuteView;