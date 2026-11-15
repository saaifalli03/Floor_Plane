"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { EDGE_SNAP_PX, MIN_ROOM_IN, SWAP_COLOR } from "@/constants/floorPlan";
import { useRoomStore } from "@/store/useRoomStore";
import type { Rect, Room } from "@/types/room";
import { snapEdge, wallLines } from "@/utils/geometry";

type Handle = {
  key: string;
  l?: boolean;
  r?: boolean;
  t?: boolean;
  b?: boolean;
  cursor: string;
};

const HANDLES: Handle[] = [
  { key: "n", t: true, cursor: "ns-resize" },
  { key: "s", b: true, cursor: "ns-resize" },
  { key: "e", r: true, cursor: "ew-resize" },
  { key: "w", l: true, cursor: "ew-resize" },
  { key: "ne", t: true, r: true, cursor: "nesw-resize" },
  { key: "sw", b: true, l: true, cursor: "nesw-resize" },
  { key: "nw", t: true, l: true, cursor: "nwse-resize" },
  { key: "se", b: true, r: true, cursor: "nwse-resize" },
];

const SIZE = 10;

const handlePosition = (h: Handle) => ({
  left: h.l
    ? -SIZE / 2
    : h.r
      ? `calc(100% - ${SIZE / 2}px)`
      : `calc(50% - ${SIZE / 2}px)`,
  top: h.t
    ? -SIZE / 2
    : h.b
      ? `calc(100% - ${SIZE / 2}px)`
      : `calc(50% - ${SIZE / 2}px)`,
});

const toRect = (r: Room): Rect => ({
  x: r.x_position,
  y: r.y_position,
  width: r.width,
  length: r.length,
});

/**
 * Drag handles on a selected room's edges and corners. Moving edges snap to the grid
 * or to nearby walls, and stop at neighbouring rooms and the plot boundary.
 */
export default function RoomResizeHandles({
  room,
  pxPerInch,
}: {
  room: Room;
  pxPerInch: number;
}) {
  const { t } = useTranslation();
  const resizeRoom = useRoomStore((s) => s.resizeRoom);
  const drag = useRef<{
    handle: Handle;
    x: number;
    y: number;
    start: Rect;
  } | null>(null);

  const targetRect = (h: Handle, start: Rect, dx: number, dy: number): Rect => {
    const { rooms, plot } = useRoomStore.getState();
    const walls = wallLines(rooms, plot, room.id);
    const threshold = EDGE_SNAP_PX / pxPerInch;
    let left = start.x;
    let right = start.x + start.width;
    let top = start.y;
    let bottom = start.y + start.length;
    if (h.l)
      left = Math.min(
        snapEdge(left + dx, walls.x, threshold),
        right - MIN_ROOM_IN,
      );
    if (h.r)
      right = Math.max(
        snapEdge(right + dx, walls.x, threshold),
        left + MIN_ROOM_IN,
      );
    if (h.t)
      top = Math.min(
        snapEdge(top + dy, walls.y, threshold),
        bottom - MIN_ROOM_IN,
      );
    if (h.b)
      bottom = Math.max(
        snapEdge(bottom + dy, walls.y, threshold),
        top + MIN_ROOM_IN,
      );
    return { x: left, y: top, width: right - left, length: bottom - top };
  };

  /** Apply the target, or the closest size towards it that still fits. */
  const applyTowards = (target: Rect) => {
    const current = toRect(
      useRoomStore.getState().rooms.find((r) => r.id === room.id) ?? room,
    );
    const steps = Math.max(
      Math.abs(target.x - current.x),
      Math.abs(target.y - current.y),
      Math.abs(target.width - current.width),
      Math.abs(target.length - current.length),
    );
    for (let i = 0; i < steps; i++) {
      const f = 1 - i / steps;
      const rect = {
        x: Math.round(current.x + (target.x - current.x) * f),
        y: Math.round(current.y + (target.y - current.y) * f),
        width: Math.round(current.width + (target.width - current.width) * f),
        length: Math.round(
          current.length + (target.length - current.length) * f,
        ),
      };
      if (resizeRoom(room.id, rect)) return;
    }
  };

  const onPointerDown =
    (h: Handle) => (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Not essential.
      }
      drag.current = {
        handle: h,
        x: e.clientX,
        y: e.clientY,
        start: toRect(room),
      };
    };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / pxPerInch;
    const dy = (e.clientY - d.y) / pxPerInch;
    applyTowards(targetRect(d.handle, d.start, dx, dy));
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h.key}
          role="separator"
          aria-label={t("actions.resize_room")}
          data-html2canvas-ignore
          className="absolute touch-none rounded-sm bg-white"
          style={{
            ...handlePosition(h),
            width: SIZE,
            height: SIZE,
            border: `2px solid ${SWAP_COLOR}`,
            cursor: h.cursor,
            zIndex: 45,
          }}
          onPointerDown={onPointerDown(h)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ))}
    </>
  );
}
