"use client";

import { useCallback } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";
import { useRoomStore } from "@/store/useRoomStore";

export type AutoPlaceMode = "both" | "doors" | "windows" | "vents";

/**
 * Auto-places doors and/or windows, asking first if that would overwrite ones
 * already on the plan. Windows go after doors so they can avoid the new doors.
 */
export function useAutoDoors() {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();

  const run = useCallback(
    (mode: AutoPlaceMode) => {
      const store = useRoomStore.getState();
      // Order matters: windows avoid doors, and vents avoid both.
      const all = mode === "both";
      const doors = all || mode === "doors" ? store.autoPlaceDoors() : 0;
      const windows =
        all || mode === "windows"
          ? useRoomStore.getState().autoPlaceWindows()
          : 0;
      const vents =
        all || mode === "vents" ? useRoomStore.getState().autoPlaceVents() : 0;
      if (mode === "both") {
        message.success(
          t("messages.openings_placed", { doors, windows, vents }),
        );
      } else if (mode === "doors") {
        if (doors > 0)
          message.success(t("messages.doors_placed", { count: doors }));
        else message.warning(t("messages.no_doors_placed"));
      } else if (mode === "windows") {
        if (windows > 0)
          message.success(t("messages.windows_placed", { count: windows }));
        else message.warning(t("messages.no_windows_placed"));
      } else if (vents > 0) {
        message.success(t("messages.vents_placed", { count: vents }));
      } else {
        message.warning(t("messages.no_vents_placed"));
      }
    },
    [message, t],
  );

  return useCallback(
    (mode: AutoPlaceMode) => {
      const rooms = useRoomStore.getState().rooms;
      const hasDoors = rooms.some((r) => (r.doors?.length ?? 0) > 0);
      const hasWindows = rooms.some((r) => (r.windows?.length ?? 0) > 0);
      const hasVents = rooms.some((r) => (r.vents?.length ?? 0) > 0);
      const overwrites = {
        both: hasDoors || hasWindows || hasVents,
        doors: hasDoors,
        windows: hasWindows,
        vents: hasVents,
      }[mode];
      if (!overwrites) return run(mode);
      const content = {
        both: t("messages.confirm_auto_both"),
        doors: t("messages.confirm_auto_doors"),
        windows: t("messages.confirm_auto_windows"),
        vents: t("messages.confirm_auto_vents"),
      }[mode];
      modal.confirm({
        title: t("actions.auto_place"),
        content,
        okText: t("actions.replace"),
        cancelText: t("actions.cancel"),
        onOk: () => run(mode),
      });
    },
    [modal, run, t],
  );
}
