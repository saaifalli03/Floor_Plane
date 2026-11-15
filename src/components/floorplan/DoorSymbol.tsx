"use client";

import { useTranslation } from "react-i18next";
import { DOOR_COLORS } from "@/constants/floorPlan";
import { useWallItemDrag } from "@/hooks/useWallItemDrag";
import { useRoomStore } from "@/store/useRoomStore";
import type { Door, Wall } from "@/types/room";

export interface DoorSymbolProps {
  roomId: string;
  door: Door;
  /** Owning room size in px. */
  roomWidthPx: number;
  roomLengthPx: number;
  pxPerInch: number;
}

const ROTATION: Record<Wall, number> = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
};

/**
 * Architectural door symbol: an opening cut through the wall, the door leaf drawn
 * perpendicular to it, and a quarter-circle swing arc. It is drawn once for a door on
 * the top wall, then rotated about its own centre — a square rotated in place keeps
 * its bounding box, so only the box position changes per wall.
 *
 * The symbol is draggable: it slides along its wall and jumps to whichever wall of the
 * room the pointer is closest to.
 */
export default function DoorSymbol({
  roomId,
  door,
  roomWidthPx,
  roomLengthPx,
  pxPerInch,
}: DoorSymbolProps) {
  const { t } = useTranslation();
  const moveDoorTo = useRoomStore((s) => s.moveDoorTo);
  const { dragging, handlers } = useWallItemDrag(roomId, pxPerInch, (x, y) =>
    moveDoorTo(roomId, door.id, x, y),
  );

  const size = door.width * pxPerInch;
  const offset = door.offset * pxPerInch;
  const kind = door.kind ?? "swing";
  const overhead = kind === "overhead";
  const line = dragging ? DOOR_COLORS.active : DOOR_COLORS.leaf;
  const arc = dragging ? DOOR_COLORS.active : DOOR_COLORS.swing;

  const position: Record<Wall, { left: number; top: number }> = {
    top: { left: offset, top: 0 },
    right: { left: roomWidthPx - size, top: offset },
    bottom: { left: offset, top: roomLengthPx - size },
    left: { left: 0, top: offset },
  };

  // Hit area: the swing square for hinged doors, a strip along the wall for roll-up doors.
  const hitHeight =
    kind === "swing" ? size : Math.max(14, Math.min(size * 0.15, 20));

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        ...position[door.wall],
        width: size,
        height: size,
        zIndex: dragging ? 35 : 15,
        transform: `rotate(${ROTATION[door.wall]}deg)${door.flip ? " scaleX(-1)" : ""}`,
      }}
    >
      {/* Opening: covers this room's wall and a neighbour's wall on the same line. */}
      <div
        className="absolute left-0"
        style={{
          top: -3,
          height: 6,
          width: size,
          background: DOOR_COLORS.opening,
        }}
      />
      {kind === "opening" ? (
        /* Doorless opening: just the gap, with short jamb ticks at each end. */
        <>
          <div
            className="absolute left-0"
            style={{ top: -3, width: 2, height: 8, background: line }}
          />
          <div
            className="absolute right-0"
            style={{ top: -3, width: 2, height: 8, background: line }}
          />
        </>
      ) : overhead ? (
        /* Roll-up door: dashed outline of the door panel just inside the wall. */
        <div
          className="absolute left-0"
          style={{
            top: 3,
            width: size,
            height: Math.max(4, Math.min(size * 0.1, 10)),
            border: `1px dashed ${line}`,
          }}
        />
      ) : (
        /* Leaf (left edge) and swing arc (rounded bottom-right corner). */
        <div
          className="absolute left-0 top-0"
          style={{
            width: size,
            height: size,
            borderLeft: `2px solid ${line}`,
            borderRight: `1px solid ${arc}`,
            borderBottom: `1px solid ${arc}`,
            borderBottomRightRadius: "100%",
            background: dragging ? "rgba(79,70,229,0.08)" : undefined,
          }}
        />
      )}
      <div
        role="slider"
        aria-label={t("doors.drag_label")}
        aria-valuenow={door.offset}
        title={t("doors.drag_label")}
        data-html2canvas-ignore
        className={`pointer-events-auto absolute left-0 touch-none ${
          dragging ? "cursor-grabbing" : "cursor-move"
        }`}
        style={{ top: -4, width: size, height: hitHeight + 4 }}
        {...handlers}
      />
    </div>
  );
}
