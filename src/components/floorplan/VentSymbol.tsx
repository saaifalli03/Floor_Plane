"use client";

import { useTranslation } from "react-i18next";
import { DOOR_COLORS, VENT_COLORS } from "@/constants/floorPlan";
import { useWallItemDrag } from "@/hooks/useWallItemDrag";
import { useRoomStore } from "@/store/useRoomStore";
import type { RoomVent } from "@/types/room";

export interface VentSymbolProps {
  roomId: string;
  vent: RoomVent;
  /** Owning room size in px. */
  roomWidthPx: number;
  roomLengthPx: number;
  pxPerInch: number;
}

/** Frame depth (px), drawn just inside the wall like windows. */
const THICKNESS = 10;
/** Gap between louvre slats (px). */
const SLAT_GAP = 4;

/**
 * Louvred wall vent: a small frame in the wall filled with slats running across it.
 * Draggable along and between the room's walls.
 */
export default function VentSymbol({
  roomId,
  vent,
  roomWidthPx,
  roomLengthPx,
  pxPerInch,
}: VentSymbolProps) {
  const { t } = useTranslation();
  const moveVentTo = useRoomStore((s) => s.moveVentTo);
  const { dragging, handlers } = useWallItemDrag(roomId, pxPerInch, (x, y) =>
    moveVentTo(roomId, vent.id, x, y),
  );

  const size = vent.width * pxPerInch;
  const offset = vent.offset * pxPerInch;
  const horizontal = vent.wall === "top" || vent.wall === "bottom";
  const box = horizontal
    ? {
        left: offset,
        top: vent.wall === "top" ? 0 : roomLengthPx - THICKNESS,
        width: size,
        height: THICKNESS,
      }
    : {
        top: offset,
        left: vent.wall === "left" ? 0 : roomWidthPx - THICKNESS,
        width: THICKNESS,
        height: size,
      };
  const frame = dragging ? DOOR_COLORS.active : VENT_COLORS.frame;
  const slats = Math.max(1, Math.floor(size / SLAT_GAP) - 1);

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        ...box,
        zIndex: dragging ? 35 : 16,
        background: VENT_COLORS.fill,
        border: `1.5px solid ${frame}`,
      }}
    >
      {Array.from({ length: slats }, (_, i) => {
        const at = (i + 1) * SLAT_GAP;
        return (
          <div
            key={i}
            className="pointer-events-none absolute"
            style={
              horizontal
                ? {
                    left: at,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: VENT_COLORS.slat,
                  }
                : {
                    top: at,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: VENT_COLORS.slat,
                  }
            }
          />
        );
      })}
      <div
        role="slider"
        aria-label={t("vents.drag_label")}
        aria-valuenow={vent.offset}
        title={t("vents.drag_label")}
        data-html2canvas-ignore
        className={`absolute touch-none ${dragging ? "cursor-grabbing" : "cursor-move"}`}
        style={{ inset: 0 }}
        {...handlers}
      />
    </div>
  );
}
