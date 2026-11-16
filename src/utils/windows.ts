import { WINDOW, WINDOW_RULES } from "@/constants/floorPlan";
import type { RoomVent, RoomWindow, Wall, WallItem } from "@/types/room";
import { sharedSpan, wallLength, type RoomLike, type WallSpan } from "./doors";
import { createId } from "./id";

type Interval = [number, number];

/** Remove `cut` from every interval in `list`. */
const subtract = (list: Interval[], cut: Interval): Interval[] =>
  list.flatMap(([s, e]) => {
    if (cut[1] <= s || cut[0] >= e) return [[s, e] as Interval];
    const out: Interval[] = [];
    if (cut[0] > s) out.push([s, cut[0]]);
    if (cut[1] < e) out.push([cut[1], e]);
    return out;
  });

const WALLS: Wall[] = ["top", "right", "bottom", "left"];

/**
 * Stretches of a room's walls that face outside — not shared with any other room and
 * not taken by a door — trimmed so windows keep clear of corners, doors and neighbours.
 */
export const outsideSpans = (
  room: RoomLike,
  others: RoomLike[],
  doors: WallItem[] = [],
  clearance: number = WINDOW.clearance,
  minWidth: number = WINDOW.min,
): WallSpan[] =>
  WALLS.flatMap((wall) => {
    let free: Interval[] = [[0, wallLength(room, wall)]];
    for (const other of others) {
      const span = sharedSpan(room, other);
      if (span && span.wall === wall)
        free = subtract(free, [span.start, span.end]);
    }
    for (const door of doors) {
      if (door.wall === wall)
        free = subtract(free, [door.offset, door.offset + door.width]);
    }
    return free
      .map(([start, end]) => ({
        wall,
        start: start + clearance,
        end: end - clearance,
      }))
      .filter((span) => span.end - span.start >= minWidth);
  });

/** Windows for one room: the longest outside stretches, at most one per wall. */
export const windowsFor = (
  room: RoomLike,
  others: RoomLike[],
  doors: WallItem[] = [],
): RoomWindow[] => {
  const rule = WINDOW_RULES[room.type];
  if (rule.max === 0) return [];
  const spans = outsideSpans(room, others, doors).sort(
    (a, b) => b.end - b.start - (a.end - a.start),
  );
  const used = new Set<Wall>();
  const windows: RoomWindow[] = [];
  for (const span of spans) {
    if (windows.length >= rule.max) break;
    if (used.has(span.wall)) continue;
    const width = Math.min(rule.width, span.end - span.start);
    if (width < WINDOW.min) continue;
    used.add(span.wall);
    windows.push({
      id: createId(),
      wall: span.wall,
      width,
      offset: Math.round(span.start + (span.end - span.start - width) / 2),
    });
  }
  return windows;
};

/** Windows for every room, using each room's current doors. */
export const autoPlaceWindows = (
  rooms: (RoomLike & { doors?: WallItem[] })[],
): RoomWindow[][] =>
  rooms.map((room, i) =>
    windowsFor(
      room,
      rooms.filter((_, j) => j !== i),
      room.doors,
    ),
  );

/** A new window centred on the room's longest wall (for the manual "Add window" button). */
export const defaultWindowFor = (room: RoomLike): RoomWindow => {
  const wall: Wall = room.width >= room.length ? "top" : "left";
  const len = wallLength(room, wall);
  const width = Math.min(WINDOW_RULES[room.type].width || WINDOW.default, len);
  return { id: createId(), wall, width, offset: Math.round((len - width) / 2) };
};

/**
 * Drop windows that now sit on a wall shared with another room (e.g. after a room was
 * added or moved next to them) — windows only make sense on outside walls.
 * Rooms whose windows are unchanged keep their identity so React can skip them.
 */
export const pruneInteriorWindows = <
  R extends RoomLike & { windows?: RoomWindow[]; vents?: RoomVent[] },
>(
  rooms: R[],
): R[] =>
  rooms.map((room, i) => {
    if (!room.windows?.length && !room.vents?.length) return room;
    const shared = rooms
      .filter((_, j) => j !== i)
      .map((other) => sharedSpan(room, other))
      .filter((span): span is WallSpan => !!span);
    const outside = (w: WallItem) =>
      !shared.some(
        (span) =>
          span.wall === w.wall &&
          w.offset < span.end &&
          w.offset + w.width > span.start,
      );
    const windows = room.windows?.filter(outside);
    const vents = room.vents?.filter(outside);
    return windows?.length === room.windows?.length &&
      vents?.length === room.vents?.length
      ? room
      : { ...room, windows, vents };
  });

/** A window centred on a given wall (for the canvas "+" menu). */
export const windowOnWall = (room: RoomLike, wall: Wall): RoomWindow => {
  const len = wallLength(room, wall);
  const width = Math.min(WINDOW_RULES[room.type].width || WINDOW.default, len);
  return { id: createId(), wall, width, offset: Math.round((len - width) / 2) };
};
