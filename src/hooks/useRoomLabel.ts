"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Room } from "@/types/room";

/** Returns a function that resolves the display name for a room. */
export function useRoomLabel() {
  const { t } = useTranslation();
  return useCallback(
    (room: Pick<Room, "type" | "customName">) =>
      (room.type === "custom" && room.customName) || t(`room_types.${room.type}`),
    [t],
  );
}
