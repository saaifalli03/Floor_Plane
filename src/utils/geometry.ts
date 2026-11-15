import {
  CANVAS_TARGET_PX,
  INCHES_PER_FOOT,
  MAX_PX_PER_FOOT,
  MIN_PX_PER_FOOT,
  SNAP_INCHES,
} from "@/constants/floorPlan";
import type { PlotSize, Rect, Room } from "@/types/room";

export const snap = (value: number, step = SNAP_INCHES) => Math.round(value / step) * step;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const roomToRect = (room: Room): Rect => ({
  x: room.x_position,
  y: room.y_position,
  width: room.width,
  length: room.length,
});

/** Strict overlap: rooms that merely share a wall do not collide. */
export const rectsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.length && a.y + a.length > b.y;

export const isInsidePlot = (r: Rect, plot: PlotSize) =>
  r.x >= 0 && r.y >= 0 && r.x + r.width <= plot.width && r.y + r.length <= plot.length;

export const collidesWithAny = (rect: Rect, rooms: Room[], ignoreId?: string) =>
  rooms.some((room) => room.id !== ignoreId && rectsOverlap(rect, roomToRect(room)));

export const isValidPlacement = (rect: Rect, rooms: Room[], plot: PlotSize, ignoreId?: string) =>
  isInsidePlot(rect, plot) && !collidesWithAny(rect, rooms, ignoreId);

/** Scan the plot row by row for the first free slot. */
export const findFreePosition = (
  width: number,
  length: number,
  rooms: Room[],
  plot: PlotSize,
): { x: number; y: number } | null => {
  for (let y = 0; y + length <= plot.length; y += SNAP_INCHES) {
    for (let x = 0; x + width <= plot.width; x += SNAP_INCHES) {
      if (!collidesWithAny({ x, y, width, length }, rooms)) return { x, y };
    }
  }
  return null;
};

/**
 * Snap one axis: prefer lining an edge up with a nearby wall (other rooms or the plot
 * boundary) within `threshold`, otherwise fall back to the grid. Result stays inside the plot.
 */
const snapAxis = (raw: number, size: number, walls: number[], max: number, threshold: number) => {
  let best = snap(raw);
  let bestDist = threshold;
  for (const wall of walls) {
    for (const candidate of [wall, wall - size]) {
      const dist = Math.abs(raw - candidate);
      if (dist <= bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
  }
  return clamp(Math.round(best), 0, Math.max(0, max - size));
};

/** Where a dragged room lands for a given raw delta (inches). */
export const computeDragPosition = (
  room: Room,
  dx: number,
  dy: number,
  rooms: Room[],
  plot: PlotSize,
  threshold: number,
) => {
  const others = rooms.filter((r) => r.id !== room.id);
  const xWalls = [0, plot.width, ...others.flatMap((r) => [r.x_position, r.x_position + r.width])];
  const yWalls = [0, plot.length, ...others.flatMap((r) => [r.y_position, r.y_position + r.length])];
  return {
    x: snapAxis(room.x_position + dx, room.width, xWalls, plot.width, threshold),
    y: snapAxis(room.y_position + dy, room.length, yWalls, plot.length, threshold),
  };
};

/** Pixels per inch so the whole plot fits the target canvas box. */
export const pxPerInchFor = (plot: PlotSize) => {
  const pxPerFoot = Math.min(
    CANVAS_TARGET_PX.width / (plot.width / INCHES_PER_FOOT),
    CANVAS_TARGET_PX.height / (plot.length / INCHES_PER_FOOT),
  );
  return clamp(pxPerFoot, MIN_PX_PER_FOOT, MAX_PX_PER_FOOT) / INCHES_PER_FOOT;
};

/** Square feet, rounded to one decimal. */
export const areaSqFt = (width: number, length: number) =>
  Math.round(((width * length) / (INCHES_PER_FOOT * INCHES_PER_FOOT)) * 10) / 10;

export const totalAreaSqFt = (rooms: Room[]) =>
  Math.round(rooms.reduce((sum, r) => sum + areaSqFt(r.width, r.length), 0) * 10) / 10;

export const splitFeetInches = (totalInches: number) => {
  const rounded = Math.round(totalInches);
  return { feet: Math.floor(rounded / INCHES_PER_FOOT), inches: rounded % INCHES_PER_FOOT };
};

/** The other room containing point (x, y), if any. */
export const roomAtPoint = (x: number, y: number, rooms: Room[], ignoreId?: string) =>
  rooms.find(
    (r) =>
      r.id !== ignoreId &&
      x >= r.x_position &&
      x < r.x_position + r.width &&
      y >= r.y_position &&
      y < r.y_position + r.length,
  );

/**
 * Plan a swap: `a` moves to `b`'s top-left corner and `b` to `a`'s old one. Returns the
 * new positions, or null if either room would leave the plot or hit another room.
 */
export const planSwap = (a: Room, b: Room, rooms: Room[], plot: PlotSize) => {
  const nextA: Rect = { x: b.x_position, y: b.y_position, width: a.width, length: a.length };
  const nextB: Rect = { x: a.x_position, y: a.y_position, width: b.width, length: b.length };
  const others = rooms.filter((r) => r.id !== a.id && r.id !== b.id);
  const fits = (r: Rect) => isInsidePlot(r, plot) && !collidesWithAny(r, others);
  if (!fits(nextA) || !fits(nextB) || rectsOverlap(nextA, nextB)) return null;
  return { a: { x: nextA.x, y: nextA.y }, b: { x: nextB.x, y: nextB.y } };
};

/** Snap a moving edge to a nearby wall within `threshold`, else to the grid. */
export const snapEdge = (raw: number, walls: number[], threshold: number) => {
  let best = snap(raw);
  let bestDist = threshold;
  for (const wall of walls) {
    const dist = Math.abs(raw - wall);
    if (dist <= bestDist) {
      best = wall;
      bestDist = dist;
    }
  }
  return Math.round(best);
};

/** Vertical (x) and horizontal (y) wall lines of other rooms plus the plot boundary. */
export const wallLines = (rooms: Room[], plot: PlotSize, ignoreId?: string) => {
  const others = rooms.filter((r) => r.id !== ignoreId);
  return {
    x: [0, plot.width, ...others.flatMap((r) => [r.x_position, r.x_position + r.width])],
    y: [0, plot.length, ...others.flatMap((r) => [r.y_position, r.y_position + r.length])],
  };
};
