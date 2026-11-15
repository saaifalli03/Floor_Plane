import { DOOR, NO_OPENING_TYPES } from "@/constants/floorPlan";
import type {
  Door,
  PlotSize,
  Room,
  RoomType,
  Wall,
  WallItem,
} from "@/types/room";
import { clamp } from "./geometry";
import { createId } from "./id";

export type RoomLike = Pick<
  Room,
  "type" | "x_position" | "y_position" | "width" | "length"
>;

export const wallLength = (room: Pick<Room, "width" | "length">, wall: Wall) =>
  wall === "top" || wall === "bottom" ? room.width : room.length;

/** Keep a wall item's width and position within its wall. */
export const normalizeWallItem = <T extends WallItem>(
  room: Pick<Room, "width" | "length">,
  item: T,
  minWidth: number,
): T => {
  const len = wallLength(room, item.wall);
  const width = Math.round(clamp(item.width, Math.min(minWidth, len), len));
  const offset = Math.round(clamp(item.offset, 0, len - width));
  return { ...item, width, offset };
};

export const normalizeDoor = (
  room: Pick<Room, "width" | "length">,
  door: Door,
): Door => normalizeWallItem(room, door, DOOR.min);

/** "Rotate" swaps width/length (a transpose), so walls map across the diagonal. */
const TRANSPOSED_WALL: Record<Wall, Wall> = {
  top: "left",
  left: "top",
  bottom: "right",
  right: "bottom",
};
export const transposeWallItems = <T extends WallItem>(items: T[] = []) =>
  items.map((d) => ({ ...d, wall: TRANSPOSED_WALL[d.wall] }));

/** A new door centred on the room's longest wall. */
export const defaultDoorFor = (room: Pick<Room, "width" | "length">): Door => {
  const wall: Wall = room.width >= room.length ? "bottom" : "right";
  const len = wallLength(room, wall);
  const width = Math.min(DOOR.default, len);
  return { id: createId(), wall, width, offset: Math.round((len - width) / 2) };
};

// ---------------------------------------------------------------------------
// Automatic placement
// ---------------------------------------------------------------------------

/** Rooms people walk through, best first. Anything else is a "leaf" (bedroom, bath…). */
const HUB_RANK: Partial<Record<RoomType, number>> = {
  hallway: 0,
  living_area: 1,
  tv_lounge: 2,
  dining: 3,
  kitchen: 4,
};
const LEAF_COST = 100;
const ROOT_PREFERENCE: RoomType[] = [
  "living_area",
  "tv_lounge",
  "hallway",
  "dining",
  "kitchen",
];

/** A stretch of wall on `room`, given as [start, end) offsets along that wall. */
export interface WallSpan {
  wall: Wall;
  start: number;
  end: number;
}

/** The wall segment `a` shares with `b`, from a's point of view. */
export const sharedSpan = (a: RoomLike, b: RoomLike): WallSpan | null => {
  const aR = a.x_position + a.width;
  const aB = a.y_position + a.length;
  const bR = b.x_position + b.width;
  const bB = b.y_position + b.length;
  const yOverlap = [
    Math.max(a.y_position, b.y_position),
    Math.min(aB, bB),
  ] as const;
  const xOverlap = [
    Math.max(a.x_position, b.x_position),
    Math.min(aR, bR),
  ] as const;

  if (aR === b.x_position && yOverlap[1] > yOverlap[0])
    return {
      wall: "right",
      start: yOverlap[0] - a.y_position,
      end: yOverlap[1] - a.y_position,
    };
  if (a.x_position === bR && yOverlap[1] > yOverlap[0])
    return {
      wall: "left",
      start: yOverlap[0] - a.y_position,
      end: yOverlap[1] - a.y_position,
    };
  if (aB === b.y_position && xOverlap[1] > xOverlap[0])
    return {
      wall: "bottom",
      start: xOverlap[0] - a.x_position,
      end: xOverlap[1] - a.x_position,
    };
  if (a.y_position === bB && xOverlap[1] > xOverlap[0])
    return {
      wall: "top",
      start: xOverlap[0] - a.x_position,
      end: xOverlap[1] - a.x_position,
    };
  return null;
};

/** Walls of `room` that sit on the plot boundary (exterior walls), longest first. */
const exteriorSpans = (room: RoomLike, plot: PlotSize): WallSpan[] => {
  const spans: WallSpan[] = [];
  if (room.y_position === 0)
    spans.push({ wall: "top", start: 0, end: room.width });
  if (room.y_position + room.length === plot.length)
    spans.push({ wall: "bottom", start: 0, end: room.width });
  if (room.x_position === 0)
    spans.push({ wall: "left", start: 0, end: room.length });
  if (room.x_position + room.width === plot.width)
    spans.push({ wall: "right", start: 0, end: room.length });
  return spans.sort((p, q) => q.end - q.start - (p.end - p.start));
};

/** Centre a door of the preferred width in a span, shrinking it if needed. */
const doorInSpan = (span: WallSpan, preferred: number): Door | null => {
  const usable = span.end - span.start - DOOR.jamb * 2;
  const width = Math.min(preferred, usable);
  if (width < DOOR.min) return null;
  return {
    id: createId(),
    wall: span.wall,
    width,
    offset: Math.round(span.start + (span.end - span.start - width) / 2),
  };
};

const preferredWidth = (type: RoomType) =>
  type === "bathroom" ? DOOR.bathroom : DOOR.default;

/** Stairs open straight onto the next space, so they get a doorless opening. */
const doorFor = (room: RoomLike, span: WallSpan): Door | null => {
  if (room.type !== "stairs")
    return doorInSpan(span, preferredWidth(room.type));
  const flight = Math.min(room.width, room.length);
  const door = doorInSpan(span, flight);
  return door && { ...door, kind: "opening" };
};
const canHostDoor = (span: WallSpan | null): span is WallSpan =>
  !!span && span.end - span.start - DOOR.jamb * 2 >= DOOR.min;

/**
 * Connect every room with doors so the whole plan is reachable from the entrance.
 * Works like Prim's algorithm: grow outwards from the main room, always preferring to
 * pass through hallways and living spaces rather than through bedrooms or bathrooms.
 * Returns a door list per room index (doors swing into the room that owns them).
 */
export const autoPlaceDoors = (rooms: RoomLike[], plot: PlotSize): Door[][] => {
  const doors: Door[][] = rooms.map(() => []);
  if (rooms.length === 0) return doors;

  const rank = (i: number) => HUB_RANK[rooms[i].type] ?? LEAF_COST;
  const rootIndex = (() => {
    for (const type of ROOT_PREFERENCE) {
      const i = rooms.findIndex((r) => r.type === type);
      if (i >= 0) return i;
    }
    return 0;
  })();

  // Ventilation shafts are sealed: leave them out of the door network entirely.
  const visited = new Set<number>([rootIndex]);
  rooms.forEach((r, i) => {
    if (NO_OPENING_TYPES.includes(r.type)) visited.add(i);
  });
  // Rooms not reachable from the root (e.g. an isolated block) start their own tree.
  while (visited.size < rooms.length) {
    let best: {
      from: number;
      to: number;
      span: WallSpan;
      cost: number;
    } | null = null;
    for (const from of visited) {
      for (let to = 0; to < rooms.length; to++) {
        if (visited.has(to)) continue;
        const span = sharedSpan(rooms[to], rooms[from]);
        if (!canHostDoor(span)) continue;
        // Pass through hubs first; among equals prefer the longer shared wall.
        const cost = rank(from) * 1000 - (span.end - span.start);
        if (!best || cost < best.cost) best = { from, to, span, cost };
      }
    }
    if (!best) {
      const next = rooms.findIndex((_, i) => !visited.has(i));
      visited.add(next);
      continue;
    }
    const door = doorFor(rooms[best.to], best.span);
    if (door) doors[best.to].push(door);
    visited.add(best.to);
  }

  // Main entrance on the root room's longest exterior wall.
  const entranceSpan = exteriorSpans(rooms[rootIndex], plot)[0];
  const entrance = entranceSpan && doorInSpan(entranceSpan, DOOR.entrance);
  if (entrance) doors[rootIndex].push(entrance);

  // Vehicle door for each garage.
  rooms.forEach((room, i) => {
    if (room.type !== "garage") return;
    const span = exteriorSpans(room, plot)[0];
    const door = span && doorInSpan(span, DOOR.garage);
    if (door) doors[i].push({ ...door, kind: "overhead" });
  });

  return doors;
};

/**
 * A sensible first door for a newly added room: on the wall it shares with the best
 * neighbouring room (hallways and living spaces first, then the longest shared wall).
 * A free-standing room gets a door centred on its longest wall.
 */
export const suggestDoorFor = (room: RoomLike, others: RoomLike[]): Door => {
  let best: { span: WallSpan; score: number } | null = null;
  for (const other of others) {
    const span = sharedSpan(room, other);
    if (!canHostDoor(span)) continue;
    const score =
      (HUB_RANK[other.type] ?? LEAF_COST) * 1000 - (span.end - span.start);
    if (!best || score < best.score) best = { span, score };
  }
  const shared = best && doorFor(room, best.span);
  if (shared) return shared;
  const isStairs = room.type === "stairs";
  const width = isStairs
    ? Math.min(room.width, room.length)
    : preferredWidth(room.type);
  // Stairs open at the foot of the flight (the short wall); other rooms use the long wall.
  const fallback = defaultDoorFor(room);
  const wall: Wall = isStairs
    ? room.length >= room.width
      ? "bottom"
      : "left"
    : fallback.wall;
  return normalizeDoor(room, {
    ...fallback,
    wall,
    width,
    offset: Math.round((wallLength(room, wall) - width) / 2),
    kind: isStairs ? "opening" : undefined,
  });
};

/**
 * Re-home a door or window to the point (inches, room-local) the user is dragging it to:
 * the closest wall, centred on the pointer along that wall.
 */
export const moveWallItemToPoint = <T extends WallItem>(
  room: Pick<Room, "width" | "length">,
  door: T,
  x: number,
  y: number,
  minWidth: number = DOOR.min,
): T => {
  const distances: [Wall, number][] = [
    ["top", y],
    ["bottom", room.length - y],
    ["left", x],
    ["right", room.width - x],
  ];
  const [wall] = distances.reduce((a, b) => (b[1] < a[1] ? b : a));
  const along = wall === "top" || wall === "bottom" ? x : y;
  return normalizeWallItem(
    room,
    { ...door, wall, offset: Math.round(along - door.width / 2) },
    minWidth,
  );
};

/** A door centred on a given wall (for the canvas "+" menu). Stairs get an opening. */
export const doorOnWall = (room: RoomLike, wall: Wall): Door => {
  const len = wallLength(room, wall);
  const stairs = room.type === "stairs";
  const width = Math.min(
    stairs ? Math.min(room.width, room.length) : preferredWidth(room.type),
    len,
  );
  return {
    id: createId(),
    wall,
    width,
    offset: Math.round((len - width) / 2),
    kind: stairs ? "opening" : undefined,
  };
};
