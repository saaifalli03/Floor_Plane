import { DOOR, MIN_ROOM_IN, VENT, WINDOW } from "@/constants/floorPlan";
import type { Rect, Room, WallItem } from "@/types/room";
import { normalizeWallItem } from "./doors";

/**
 * Give a room a new rectangle, keeping its doors and windows where they physically
 * were: when the left/top edge moves, offsets measured from it shift by the same
 * amount, then everything is clamped onto the (possibly shorter) walls.
 */
export const applyRect = (room: Room, rect: Rect): Room => {
  const dx = rect.x - room.x_position;
  const dy = rect.y - room.y_position;
  const next = { width: rect.width, length: rect.length };
  const shift = <T extends WallItem>(item: T, min: number): T =>
    normalizeWallItem(
      next,
      {
        ...item,
        offset:
          item.offset -
          (item.wall === "top" || item.wall === "bottom" ? dx : dy),
      },
      min,
    );
  return {
    ...room,
    x_position: rect.x,
    y_position: rect.y,
    width: rect.width,
    length: rect.length,
    doors: room.doors?.map((d) => shift(d, DOOR.min)),
    windows: room.windows?.map((w) => shift(w, WINDOW.min)),
    vents: room.vents?.map((v) => shift(v, VENT.min)),
  };
};

export const isBigEnough = (rect: Rect) =>
  rect.width >= MIN_ROOM_IN && rect.length >= MIN_ROOM_IN;
