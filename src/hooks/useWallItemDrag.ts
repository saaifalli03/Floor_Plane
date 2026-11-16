"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRoomStore } from "@/store/useRoomStore";

/**
 * Pointer handlers for dragging a door or window around its room's walls.
 * `onMove` receives the pointer position in room-local inches.
 */
export function useWallItemDrag(
  roomId: string,
  pxPerInch: number,
  onMove: (x: number, y: number) => void,
) {
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const [dragging, setDragging] = useState(false);
  const roomRect = useRef<DOMRect | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    // Keep the room itself from starting a drag.
    e.stopPropagation();
    e.preventDefault();
    selectRoom(roomId);
    roomRect.current =
      e.currentTarget
        .closest("[aria-roledescription]")
        ?.getBoundingClientRect() ?? null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety (keeps the drag alive outside the handle); carry on without it.
    }
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const rect = roomRect.current;
    if (!dragging || !rect) return;
    onMove(
      (e.clientX - rect.left) / pxPerInch,
      (e.clientY - rect.top) / pxPerInch,
    );
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
    roomRect.current = null;
  };

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
