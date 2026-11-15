"use client";

import { useTranslation } from "react-i18next";
import { DOOR_COLORS, WINDOW_COLORS } from "@/constants/floorPlan";
import { useWallItemDrag } from "@/hooks/useWallItemDrag";
import { useRoomStore } from "@/store/useRoomStore";
import type { RoomWindow } from "@/types/room";

export interface WindowSymbolProps {
  roomId: string;
  window: RoomWindow;
  /** Owning room size in px. */
  roomWidthPx: number;
  roomLengthPx: number;
  pxPerInch: number;
}

/** Depth of the window frame (px), drawn just inside the wall line so it never
 * spills past the plot edge (where it would be clipped from the PDF). */
const THICKNESS = 10;

/**
 * Architectural window symbol: a frame set into the wall with a line for the glass
 * running along its length. Draggable along and between the room's walls.
 */
export default function WindowSymbol({
  roomId,
  window: win,
  roomWidthPx,
  roomLengthPx,
  pxPerInch,
}: WindowSymbolProps) {
  const { t } = useTranslation();
  const moveWindowTo = useRoomStore((s) => s.moveWindowTo);
  const { dragging, handlers } = useWallItemDrag(roomId, pxPerInch, (x, y) =>
    moveWindowTo(roomId, win.id, x, y),
  );

  const size = win.width * pxPerInch;
  const offset = win.offset * pxPerInch;
  const horizontal = win.wall === "top" || win.wall === "bottom";
  const box = horizontal
    ? {
        left: offset,
        top: win.wall === "top" ? 0 : roomLengthPx - THICKNESS,
        width: size,
        height: THICKNESS,
      }
    : {
        top: offset,
        left: win.wall === "left" ? 0 : roomWidthPx - THICKNESS,
        width: THICKNESS,
        height: size,
      };

  const frame = dragging ? DOOR_COLORS.active : WINDOW_COLORS.frame;
  // Two panes of glass: lines at a third and two thirds of the frame depth.
  const glassLines = [THICKNESS / 3, (THICKNESS * 2) / 3].map((at) =>
    horizontal
      ? { left: 0, right: 0, top: at - 1, height: 1.5 }
      : { top: 0, bottom: 0, left: at - 1, width: 1.5 },
  );

  return (
    <div
      className="absolute"
      style={{
        ...box,
        zIndex: dragging ? 35 : 16,
        background: WINDOW_COLORS.fill,
        border: `1.5px solid ${frame}`,
      }}
    >
      {glassLines.map((style, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{ ...style, background: WINDOW_COLORS.glass }}
        />
      ))}
      <div
        role="slider"
        aria-label={t("windows.drag_label")}
        aria-valuenow={win.offset}
        title={t("windows.drag_label")}
        data-html2canvas-ignore
        className={`absolute touch-none ${dragging ? "cursor-grabbing" : "cursor-move"}`}
        style={{ inset: -5 }}
        {...handlers}
      />
    </div>
  );
}
