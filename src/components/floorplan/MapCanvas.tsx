"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type Modifier,
} from "@dnd-kit/core";
import { App } from "antd";
import { useTranslation } from "react-i18next";
import {
  CANVAS_ELEMENT_ID,
  EDGE_SNAP_PX,
  INCHES_PER_FOOT,
  SNAP_INCHES,
} from "@/constants/floorPlan";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import { useRoomStore } from "@/store/useRoomStore";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import {
  areaSqFt,
  computeDragPosition,
  isValidPlacement,
  planSwap,
  pxPerInchFor,
  roomAtPoint,
} from "@/utils/geometry";
import CanvasEmptyState from "./CanvasEmptyState";
import CanvasResizeHandles from "./CanvasResizeHandles";
import RoomBlock from "./RoomBlock";

/** Grid spacing adapts to zoom so lines never get too dense. */
const gridFeetFor = (pxPerFoot: number) =>
  pxPerFoot >= 10 ? 1 : pxPerFoot >= 4 ? 5 : 10;

const gridBackground = (minorPx: number) => {
  const majorPx = minorPx * 5;
  return {
    backgroundColor: "#ffffff",
    backgroundImage: [
      "linear-gradient(to right, #cbd5e1 1px, transparent 1px)",
      "linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)",
      "linear-gradient(to right, #eef2f7 1px, transparent 1px)",
      "linear-gradient(to bottom, #eef2f7 1px, transparent 1px)",
    ].join(","),
    backgroundSize: `${majorPx}px ${majorPx}px, ${majorPx}px ${majorPx}px, ${minorPx}px ${minorPx}px, ${minorPx}px ${minorPx}px`,
  };
};

export default function MapCanvas() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { formatLength } = useLengthFormat();
  const plot = useRoomStore((s) => s.plot);
  const rooms = useRoomStore((s) => s.rooms);
  const selectedId = useRoomStore((s) => s.selectedId);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const moveRoom = useRoomStore((s) => s.moveRoom);
  const swapRooms = useRoomStore((s) => s.swapRooms);
  const roomLabel = useRoomLabel();
  const [invalidId, setInvalidId] = useState<string | null>(null);
  /** Room the dragged room would trade places with if dropped now. */
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);

  /** Scale frozen while the plot is being resized by dragging; otherwise auto-fit. */
  const [scaleLock, setScaleLock] = useState<number | null>(null);
  const pxPerInch = scaleLock ?? pxPerInchFor(plot);
  const gridFeet = gridFeetFor(pxPerInch * INCHES_PER_FOOT);
  const canvasWidth = plot.width * pxPerInch;
  const canvasHeight = plot.length * pxPerInch;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  /** Snapped target position (inches) for a drag delta in screen pixels. */
  const targetFor = useCallback(
    (id: string, dxPx: number, dyPx: number) => {
      const room = rooms.find((r) => r.id === id);
      if (!room) return null;
      const pos = computeDragPosition(
        room,
        dxPx / pxPerInch,
        dyPx / pxPerInch,
        rooms,
        plot,
        EDGE_SNAP_PX / pxPerInch,
      );
      return { room, ...pos };
    },
    [plot, pxPerInch, rooms],
  );

  // Snap the visual drag preview to exactly where the room will land.
  const modifiers = useMemo<Modifier[]>(
    () => [
      ({ transform, active }) => {
        const target =
          active && targetFor(String(active.id), transform.x, transform.y);
        if (!target) return transform;
        return {
          ...transform,
          x: (target.x - target.room.x_position) * pxPerInch,
          y: (target.y - target.room.y_position) * pxPerInch,
        };
      },
    ],
    [pxPerInch, targetFor],
  );

  type DragTarget = NonNullable<ReturnType<typeof targetFor>>;

  /** Dropping a room with its centre over another room means "swap with it". */
  const swapCandidate = ({ room, x, y }: DragTarget) => {
    const other = roomAtPoint(
      x + room.width / 2,
      y + room.length / 2,
      rooms,
      room.id,
    );
    return other ? { other, plan: planSwap(room, other, rooms, plot) } : null;
  };

  const resetDragState = () => {
    setInvalidId(null);
    setSwapTargetId(null);
  };

  const handleDragMove = ({ active, delta }: DragMoveEvent) => {
    const target = targetFor(String(active.id), delta.x, delta.y);
    if (!target) return;
    const { room, x, y } = target;
    const ok = isValidPlacement(
      { x, y, width: room.width, length: room.length },
      rooms,
      plot,
      room.id,
    );
    const swap = ok ? null : swapCandidate(target);
    setSwapTargetId(swap?.plan ? swap.other.id : null);
    setInvalidId(ok || swap?.plan ? null : room.id);
  };

  const handleDragEnd = ({ active, delta }: DragEndEvent) => {
    resetDragState();
    const target = targetFor(String(active.id), delta.x, delta.y);
    if (!target) return;
    const { room, x, y } = target;
    if (x === room.x_position && y === room.y_position) return;
    if (moveRoom(room.id, x, y)) return;

    const swap = swapCandidate(target);
    const names = swap && { a: roomLabel(room), b: roomLabel(swap.other) };
    if (swap && names && swapRooms(room.id, swap.other.id)) {
      message.success(t("messages.rooms_swapped", names));
    } else if (names) {
      message.error(t("messages.swap_blocked", names));
    } else {
      message.error(t("messages.collision"));
    }
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {t("canvas.plan_size", {
            width: formatLength(plot.width),
            length: formatLength(plot.length),
            area: areaSqFt(plot.width, plot.length),
          })}
        </span>
        <span>
          {t("canvas.scale_hint", {
            size: formatLength(gridFeet * INCHES_PER_FOOT),
            snap: formatLength(SNAP_INCHES),
          })}
        </span>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
        {/* Padding lives on an inner box: scroll containers drop a child's right/bottom
            padding, which would clip the canvas resize handles and the "+" buttons. */}
        <div className="mx-auto w-fit p-8">
          <DndContext
            sensors={sensors}
            modifiers={modifiers}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={resetDragState}
          >
            <div
              id={CANVAS_ELEMENT_ID}
              className="relative box-content border-2 border-slate-400"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                minWidth: canvasWidth,
                ...gridBackground(gridFeet * INCHES_PER_FOOT * pxPerInch),
              }}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) selectRoom(null);
              }}
            >
              {rooms.length === 0 && <CanvasEmptyState />}
              <CanvasResizeHandles
                pxPerInch={pxPerInch}
                onScaleLock={setScaleLock}
              />
              {rooms.map((room) => (
                <RoomBlock
                  key={room.id}
                  room={room}
                  pxPerInch={pxPerInch}
                  selected={room.id === selectedId}
                  invalid={room.id === invalidId}
                  swapTarget={room.id === swapTargetId}
                  onSelect={selectRoom}
                />
              ))}
            </div>
          </DndContext>
        </div>
      </div>
    </section>
  );
}
