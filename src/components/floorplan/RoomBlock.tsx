"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ROOM_COLORS, SWAP_COLOR } from "@/constants/floorPlan";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import type { Room } from "@/types/room";
import DoorSymbol from "./DoorSymbol";
import RoomActions from "./RoomActions";
import RoomResizeHandles from "./RoomResizeHandles";
import WallEditButtons from "./WallEditButtons";
import StairsSymbol from "./StairsSymbol";
import ShaftSymbol from "./ShaftSymbol";
import VentSymbol from "./VentSymbol";
import WindowSymbol from "./WindowSymbol";

export interface RoomBlockProps {
  room: Room;
  /** Canvas scale. */
  pxPerInch: number;
  selected: boolean;
  /** True while being dragged over an invalid spot. */
  invalid: boolean;
  /** True while another room is dragged over this one and would swap with it. */
  swapTarget: boolean;
  onSelect: (id: string) => void;
}

function RoomBlock({
  room,
  pxPerInch,
  selected,
  invalid,
  swapTarget,
  onSelect,
}: RoomBlockProps) {
  const roomLabel = useRoomLabel();
  const { formatDimensions } = useLengthFormat();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: room.id,
    });

  const colors = ROOM_COLORS[room.type];
  const widthPx = room.width * pxPerInch;
  const heightPx = room.length * pxPerInch;
  const compact = widthPx < 90 || heightPx < 60;
  const tiny = widthPx < 45 || heightPx < 30;
  const isStairs = room.type === "stairs";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onPointerDownCapture={() => onSelect(room.id)}
      aria-label={roomLabel(room)}
      title={`${roomLabel(room)} — ${formatDimensions(room.width, room.length)}`}
      className={`absolute flex touch-none select-none flex-col items-center justify-center text-center outline-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left: room.x_position * pxPerInch,
        top: room.y_position * pxPerInch,
        width: widthPx,
        height: heightPx,
        transform: CSS.Translate.toString(transform),
        background: invalid ? "#fee2e2" : colors.fill,
        border: `2px solid ${invalid ? "#dc2626" : colors.border}`,
        color: colors.text,
        // No z-index at rest: rooms then share one stacking context, letting door
        // openings (z 15) paint over the neighbouring room's wall.
        zIndex: isDragging ? 30 : undefined,
        outline: swapTarget ? `3px dashed ${SWAP_COLOR}` : undefined,
        outlineOffset: swapTarget ? -6 : undefined,
        boxShadow: isDragging
          ? "0 10px 25px rgba(15,23,42,0.25)"
          : selected
            ? `0 0 0 3px ${colors.border}55`
            : "none",
        opacity: isDragging ? 0.9 : 1,
      }}
    >
      {isStairs && (
        <StairsSymbol
          width={room.width}
          length={room.length}
          pxPerInch={pxPerInch}
          color={colors.border}
          foot={room.doors?.[0]?.wall}
        />
      )}

      {room.type === "vent_shaft" && (
        <ShaftSymbol
          widthPx={widthPx}
          lengthPx={heightPx}
          color={colors.border}
        />
      )}

      {!tiny && (
        // Positioned so it paints above the stairs treads; boxed on stairs for legibility.
        <div
          className="relative flex max-w-full flex-col items-center rounded px-1"
          style={
            isStairs || room.type === "vent_shaft"
              ? { background: "rgba(255,255,255,0.9)" }
              : undefined
          }
        >
          <span
            className={`max-w-full truncate font-semibold leading-tight ${compact ? "text-[10px]" : "text-sm"}`}
          >
            {roomLabel(room)}
          </span>
          <span
            className={`max-w-full truncate opacity-80 ${compact ? "text-[9px]" : "text-xs"}`}
          >
            {formatDimensions(room.width, room.length)}
          </span>
        </div>
      )}

      {room.doors?.map((door) => (
        <DoorSymbol
          key={door.id}
          roomId={room.id}
          door={door}
          roomWidthPx={widthPx}
          roomLengthPx={heightPx}
          pxPerInch={pxPerInch}
        />
      ))}

      {room.windows?.map((win) => (
        <WindowSymbol
          key={win.id}
          roomId={room.id}
          window={win}
          roomWidthPx={widthPx}
          roomLengthPx={heightPx}
          pxPerInch={pxPerInch}
        />
      ))}

      {room.vents?.map((vent) => (
        <VentSymbol
          key={vent.id}
          roomId={room.id}
          vent={vent}
          roomWidthPx={widthPx}
          roomLengthPx={heightPx}
          pxPerInch={pxPerInch}
        />
      ))}

      {selected && !isDragging && (
        <>
          <RoomResizeHandles room={room} pxPerInch={pxPerInch} />
          <WallEditButtons
            room={room}
            pxPerInch={pxPerInch}
            widthPx={widthPx}
            lengthPx={heightPx}
          />
        </>
      )}

      {selected && !isDragging && (
        <div
          data-html2canvas-ignore
          className={`absolute right-0 rounded-md ${
            room.y_position * pxPerInch < 40
              ? "top-full mt-1"
              : "bottom-full mb-1"
          } z-40 border border-slate-200 bg-white shadow-md`}
        >
          <RoomActions roomId={room.id} />
        </div>
      )}
    </div>
  );
}

export default memo(RoomBlock);
