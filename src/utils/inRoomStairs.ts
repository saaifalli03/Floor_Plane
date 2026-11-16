import {
  IN_ROOM_STAIRS,
  NO_STAIRS_INSIDE,
  WALLLESS_TYPES,
} from "@/constants/floorPlan";
import type { InRoomStairs, Rect, Room, Wall } from "@/types/room";
import { wallLength } from "./doors";

/** Whether a room has walls (its own setting, or the default for its type). */
export const hasWalls = (room: Pick<Room, "type" | "walls">) =>
  room.walls ?? !WALLLESS_TYPES.includes(room.type);

export const canHaveStairsInside = (room: Pick<Room, "type">) =>
  !NO_STAIRS_INSIDE.includes(room.type);

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/** Keep a flight inside its room. Returns undefined if the room is too small for one. */
export const normalizeInRoomStairs = (
  room: Pick<Room, "width" | "length">,
  stairs: InRoomStairs,
): InRoomStairs | undefined => {
  const along = wallLength(room, stairs.wall);
  const across =
    stairs.wall === "top" || stairs.wall === "bottom"
      ? room.length
      : room.width;
  const maxWidth = Math.min(IN_ROOM_STAIRS.maxWidth, across);
  if (along < IN_ROOM_STAIRS.minRun || maxWidth < IN_ROOM_STAIRS.minWidth)
    return undefined;
  const run = Math.round(clamp(stairs.run, IN_ROOM_STAIRS.minRun, along));
  return {
    wall: stairs.wall,
    run,
    width: Math.round(clamp(stairs.width, IN_ROOM_STAIRS.minWidth, maxWidth)),
    offset: Math.round(clamp(stairs.offset, 0, along - run)),
    ...(stairs.reverse ? { reverse: true } : {}),
  };
};

/** Doorways in the room's walls (its own doors and neighbours' on shared walls), as keep-clear areas in room coordinates. */
const doorwayZones = (room: Room, rooms: Room[]) => {
  const zones: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const other of rooms)
    for (const d of other.doors ?? []) {
      const horizontal = d.wall === "top" || d.wall === "bottom";
      const line =
        d.wall === "top"
          ? other.y_position
          : d.wall === "bottom"
            ? other.y_position + other.length
            : d.wall === "left"
              ? other.x_position
              : other.x_position + other.width;
      const start =
        (horizontal ? other.x_position : other.y_position) + d.offset;
      const depth = d.width + 10;
      const [a, b] = [start - 4, start + d.width + 4];
      const z = horizontal
        ? { x0: a, x1: b, y0: line - depth, y1: line + depth }
        : { x0: line - depth, x1: line + depth, y0: a, y1: b };
      zones.push({
        x0: z.x0 - room.x_position,
        x1: z.x1 - room.x_position,
        y0: z.y0 - room.y_position,
        y1: z.y1 - room.y_position,
      });
    }
  return zones;
};

/**
 * A sensible first flight: along the longest wall it fits on, its top end tucked into
 * a corner, with the flight and the landing at its foot kept clear of every doorway.
 */
export const defaultInRoomStairs = (room: Room, rooms: Room[] = [room]) => {
  const zones = doorwayZones(room, rooms);
  const walls = (["top", "bottom", "left", "right"] as Wall[]).sort(
    (a, b) => wallLength(room, b) - wallLength(room, a),
  );
  const candidates: InRoomStairs[] = [];
  for (const wall of walls) {
    const along = wallLength(room, wall);
    for (const run of [
      IN_ROOM_STAIRS.run,
      along - IN_ROOM_STAIRS.landing,
      IN_ROOM_STAIRS.minRun,
    ]) {
      // Top at the far corner (foot towards the start), or top at the start corner.
      candidates.push(
        { wall, offset: along - run, run, width: IN_ROOM_STAIRS.width },
        { wall, offset: 0, run, width: IN_ROOM_STAIRS.width, reverse: true },
      );
    }
  }
  for (const c of candidates) {
    const s = normalizeInRoomStairs(room, c);
    if (!s || s.run !== Math.round(c.run)) continue;
    const r = inRoomStairsRect(room, s);
    const foot = inRoomStairsFoot(s);
    const L = IN_ROOM_STAIRS.landing;
    const landing = {
      x0: foot === "left" ? r.x - L : foot === "right" ? r.x + r.width : r.x,
      x1:
        foot === "left"
          ? r.x
          : foot === "right"
            ? r.x + r.width + L
            : r.x + r.width,
      y0: foot === "top" ? r.y - L : foot === "bottom" ? r.y + r.length : r.y,
      y1:
        foot === "top"
          ? r.y
          : foot === "bottom"
            ? r.y + r.length + L
            : r.y + r.length,
    };
    if (
      landing.x0 < 0 ||
      landing.y0 < 0 ||
      landing.x1 > room.width ||
      landing.y1 > room.length
    )
      continue;
    const area = [
      { x0: r.x, x1: r.x + r.width, y0: r.y, y1: r.y + r.length },
      landing,
    ];
    const clash = area.some((a) =>
      zones.some(
        (z) => a.x0 < z.x1 && a.x1 > z.x0 && a.y0 < z.y1 && a.y1 > z.y0,
      ),
    );
    if (!clash) return s;
  }
  // Nowhere clear of doors: still offer a flight, which the user can move.
  return normalizeInRoomStairs(room, {
    wall: walls[0],
    offset: 0,
    run: IN_ROOM_STAIRS.run,
    width: IN_ROOM_STAIRS.width,
  });
};

/** The flight's footprint, relative to the room's top-left corner. */
export const inRoomStairsRect = (
  room: Pick<Room, "width" | "length">,
  s: InRoomStairs,
): Rect => {
  switch (s.wall) {
    case "top":
      return { x: s.offset, y: 0, width: s.run, length: s.width };
    case "bottom":
      return {
        x: s.offset,
        y: room.length - s.width,
        width: s.run,
        length: s.width,
      };
    case "left":
      return { x: 0, y: s.offset, width: s.width, length: s.run };
    case "right":
      return {
        x: room.width - s.width,
        y: s.offset,
        width: s.width,
        length: s.run,
      };
  }
};

/** The end of the flight you step on at. */
export const inRoomStairsFoot = (s: InRoomStairs): Wall =>
  s.wall === "top" || s.wall === "bottom"
    ? s.reverse
      ? "right"
      : "left"
    : s.reverse
      ? "bottom"
      : "top";

/**
 * The flight as a stand-alone "stairs room" in plan coordinates, so the regular
 * stairs geometry (steps climbing away from the foot) can be reused.
 */
export const inRoomStairsAsRoom = (room: Room, s: InRoomStairs): Room => {
  const r = inRoomStairsRect(room, s);
  return {
    id: `${room.id}-stairs`,
    type: "stairs",
    x_position: room.x_position + r.x,
    y_position: room.y_position + r.y,
    width: r.width,
    length: r.length,
    doors: [{ id: "foot", wall: inRoomStairsFoot(s), offset: 0, width: 0 }],
  };
};

/** Turn a flight with the room when the room is rotated (width/length swap). */
const TRANSPOSED: Record<Wall, Wall> = {
  top: "left",
  left: "top",
  bottom: "right",
  right: "bottom",
};
export const transposeInRoomStairs = (s?: InRoomStairs) =>
  s ? { ...s, wall: TRANSPOSED[s.wall] } : undefined;
