import { NO_OPENING_TYPES } from "@/constants/floorPlan";
import { TOUR, WALK, WALL_HEIGHT_IN } from "@/constants/view3d";
import type { PlotSize, Room, Wall } from "@/types/room";
import type { Part } from "./furniture";
import { stairsLayout } from "./stairs";
import {
  buildInRoomStairs,
  buildStairs,
  buildWalls,
  itemSegment,
  type Box,
} from "./scene3d";

/**
 * Pure helpers for walking through the 3D model. Like scene3d.ts, everything is in
 * plan inches: x runs right, y runs down the plan, z is height above the ground.
 */
export interface Point {
  x: number;
  y: number;
}

/** What the walker bumps into, and what they can stand on. */
export interface WalkWorld {
  /** Solid boxes: the walls (full height) and furniture. */
  solids: Box[];
  /** Stair steps: you stand on them rather than bump into them. */
  steps: Box[];
  /** Area you can wander in (the plot plus a margin outside it). */
  bounds: { x0: number; x1: number; y0: number; y1: number };
}

export const buildWalkWorld = (
  rooms: Room[],
  plot: PlotSize,
  furniture: Part[] = [],
): WalkWorld => {
  const inRoom = buildInRoomStairs(rooms);
  return {
    // Wall pieces that reach the top are treated as endlessly tall, so from the top of
    // the stairs you can look over the house but not step off onto the wall tops.
    // Open door leaves aren't solid: you brush past them, and in a narrow hallway a
    // leaf standing open would otherwise block the whole corridor.
    solids: [
      ...buildWalls(rooms, false).map((b) =>
        b.z1 >= WALL_HEIGHT_IN ? { ...b, z1: Infinity } : b,
      ),
      // Rugs and tree canopies you walk over / under; everything else is in the way.
      ...furniture.filter((p) => !p.walkThrough).map((p) => p.box),
      // Railings on stairs built inside rooms.
      ...inRoom.guards,
    ],
    steps: [
      ...rooms.filter((r) => r.type === "stairs").flatMap(buildStairs),
      ...inRoom.steps,
    ],
    bounds: {
      x0: -WALK.outsideMargin,
      x1: plot.width + WALK.outsideMargin,
      y0: -WALK.outsideMargin,
      y1: plot.length + WALK.outsideMargin,
    },
  };
};

const inside = (b: Box, p: Point) =>
  p.x >= b.x0 && p.x < b.x1 && p.y >= b.y0 && p.y < b.y1;

/** Height of whatever you'd be standing on at a point (a stair step, or the ground). */
export const floorHeightAt = (world: WalkWorld, p: Point): number =>
  world.steps.reduce((h, s) => (inside(s, p) ? Math.max(h, s.z1) : h), 0);

/** Does a body standing at `p` with its feet at `feet` overlap a solid? */
const blocked = (world: WalkWorld, p: Point, feet: number): boolean => {
  const r = WALK.radius;
  return world.solids.some(
    (b) =>
      // Low things you can step over and headers you walk under don't count.
      b.z1 > feet + WALK.stepUp &&
      b.z0 < feet + WALK.height &&
      p.x + r > b.x0 &&
      p.x - r < b.x1 &&
      p.y + r > b.y0 &&
      p.y - r < b.y1,
  );
};

/**
 * Move by (dx, dy), one axis at a time so you slide along walls instead of sticking.
 * A move is refused if it hits a solid or needs too big a step up.
 */
export const moveWalker = (
  world: WalkWorld,
  from: Point,
  dx: number,
  dy: number,
): Point => {
  const { bounds } = world;
  const tryMove = (p: Point, next: Point): Point => {
    if (
      next.x < bounds.x0 ||
      next.x > bounds.x1 ||
      next.y < bounds.y0 ||
      next.y > bounds.y1
    )
      return p;
    const here = floorHeightAt(world, p);
    const there = floorHeightAt(world, next);
    if (there - here > WALK.stepUp) return p;
    return blocked(world, next, Math.max(here, there)) ? p : next;
  };
  // When walking into a door frame, slide sideways (up to this much per unit of
  // forward motion) to line up with the opening instead of stopping dead.
  const nudge = (p: Point, next: Point, axis: "x" | "y", amount: number) => {
    const moved = tryMove(p, next);
    if (moved !== p) return moved;
    const side = axis === "x" ? "y" : "x";
    for (let k = 1; k <= 3; k++) {
      for (const sign of [1, -1]) {
        const shifted = { ...p, [side]: p[side] + sign * k * Math.abs(amount) };
        if (tryMove(p, shifted) === p) continue;
        const through = tryMove(shifted, { ...shifted, [axis]: next[axis] });
        if (through !== shifted) return through;
      }
    }
    return p;
  };
  // Long frames are split so a fast move can't tunnel through a thin wall.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (WALK.radius / 2)));
  let p = from;
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps;
    const sy = dy / steps;
    // Only nudge along the main direction of travel, so strafing along a wall is plain.
    p =
      Math.abs(sx) >= Math.abs(sy)
        ? nudge(p, { x: p.x + sx, y: p.y }, "x", sx)
        : tryMove(p, { x: p.x + sx, y: p.y });
    p =
      Math.abs(sy) > Math.abs(sx)
        ? nudge(p, { x: p.x, y: p.y + sy }, "y", sy)
        : tryMove(p, { x: p.x, y: p.y + sy });
  }
  return p;
};

/** The room a point is in (null when outside every room). */
export const roomAt = (rooms: Room[], p: Point): Room | null =>
  rooms.find(
    (r) =>
      p.x >= r.x_position &&
      p.x < r.x_position + r.width &&
      p.y >= r.y_position &&
      p.y < r.y_position + r.length,
  ) ?? null;

const OUTWARD: Record<Wall, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Yaw (camera heading) that looks along a plan direction. Yaw 0 looks "up" the plan. */
export const yawFor = (dx: number, dy: number) => Math.atan2(-dx, -dy);

/** A doorway between two rooms (or a room and the outside, `to === null`). */
interface Passage {
  from: Room;
  to: Room | null;
  /** Just inside `from`, at the middle of the doorway, and just inside `to`. */
  near: Point;
  mid: Point;
  far: Point;
}

const passages = (rooms: Room[]): Passage[] => {
  const list: Passage[] = [];
  for (const room of rooms) {
    for (const door of room.doors ?? []) {
      const seg = itemSegment(room, door);
      const along = (seg.from + seg.to) / 2;
      const mid =
        seg.orient === "h"
          ? { x: along, y: seg.line }
          : { x: seg.line, y: along };
      const out = OUTWARD[door.wall];
      const c = TOUR.doorClearance;
      const near = { x: mid.x - out.x * c, y: mid.y - out.y * c };
      const far = { x: mid.x + out.x * c, y: mid.y + out.y * c };
      const other = roomAt(rooms, far);
      const to = other && other.id !== room.id ? other : null;
      if (to && NO_OPENING_TYPES.includes(to.type)) continue;
      list.push({ from: room, to, near, mid, far });
      // Doors work both ways.
      if (to) list.push({ from: to, to: room, near: far, mid, far: near });
    }
  }
  return list;
};

/**
 * Where you stand to take a room in: the clear spot nearest its centre (furniture
 * permitting), or the top of a flight of stairs.
 */
const viewpoint = (room: Room, world?: WalkWorld): Point => {
  const cx = room.x_position + room.width / 2;
  const cy = room.y_position + room.length / 2;
  if (room.type !== "stairs")
    return world ? clearSpot(room, world) : { x: cx, y: cy };
  // Mirrors buildStairs: which end of the run is the high one.
  const { vertical, foot } = stairsLayout(
    room.width,
    room.length,
    room.doors?.[0]?.wall,
  );
  const topAtStart = vertical ? foot === "bottom" : foot === "right";
  const k = TOUR.stairsTopClearance;
  return vertical
    ? {
        x: cx,
        y: topAtStart ? room.y_position + k : room.y_position + room.length - k,
      }
    : {
        x: topAtStart ? room.x_position + k : room.x_position + room.width - k,
        y: cy,
      };
};

/** Clearance kept around the tour route and stopping spots. */
const ROUTE_MARGIN = WALK.radius + 1;

/** Tests whether the walker fits at a point in a room, clear of everything (even low things). */
const roomClearance = (room: Room, world: WalkWorld) => {
  const m = ROUTE_MARGIN;
  // Stairs count as in the way here too: routes and stopping spots stay on the floor.
  const near = [...world.solids, ...world.steps].filter(
    (b) =>
      b.z1 > 1 &&
      b.x1 > room.x_position - m &&
      b.x0 < room.x_position + room.width + m &&
      b.y1 > room.y_position - m &&
      b.y0 < room.y_position + room.length + m,
  );
  return (p: Point) =>
    !near.some(
      (b) =>
        p.x + m > b.x0 && p.x - m < b.x1 && p.y + m > b.y0 && p.y - m < b.y1,
    );
};

const GRID = 6;

/** Grid of points inside a room, kept clear of its walls. */
const roomGrid = (room: Room): Point[] => {
  const spots: Point[] = [];
  const m = ROUTE_MARGIN;
  for (
    let x = room.x_position + m;
    x <= room.x_position + room.width - m;
    x += GRID
  )
    for (
      let y = room.y_position + m;
      y <= room.y_position + room.length - m;
      y += GRID
    )
      spots.push({ x, y });
  return spots;
};

/** The spot nearest the room's centre with nothing in the way. */
const clearSpot = (room: Room, world: WalkWorld): Point => {
  const centre = {
    x: room.x_position + room.width / 2,
    y: room.y_position + room.length / 2,
  };
  const clear = roomClearance(room, world);
  return (
    roomGrid(room)
      .sort(
        (a, b) =>
          Math.hypot(a.x - centre.x, a.y - centre.y) -
          Math.hypot(b.x - centre.x, b.y - centre.y),
      )
      .find(clear) ?? centre
  );
};

/** The clear spot nearest the room's centre that can be walked to from `from`. */
const reachableSpot = (room: Room, world: WalkWorld, from: Point): Point => {
  const clear = roomClearance(room, world);
  const nodes = roomGrid(room).filter(clear);
  const key = (p: Point) => `${Math.round(p.x)},${Math.round(p.y)}`;
  const index = new Map(nodes.map((p, i) => [key(p), i]));
  const start = nodes.findIndex(
    (n) =>
      lineClearIn(clear, from, n) &&
      Math.hypot(n.x - from.x, n.y - from.y) < GRID * 3,
  );
  if (start < 0) return clearSpot(room, world);
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const u = queue.shift()!;
    for (const [dx, dy] of STEPS) {
      const v = index.get(
        key({ x: nodes[u].x + dx * GRID, y: nodes[u].y + dy * GRID }),
      );
      if (v !== undefined && !seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
    }
  }
  const centre = {
    x: room.x_position + room.width / 2,
    y: room.y_position + room.length / 2,
  };
  let best = nodes[start];
  for (const i of seen)
    if (
      Math.hypot(nodes[i].x - centre.x, nodes[i].y - centre.y) <
      Math.hypot(best.x - centre.x, best.y - centre.y)
    )
      best = nodes[i];
  return best;
};

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const lineClearIn = (clear: (p: Point) => boolean, a: Point, b: Point) => {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (!clear({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }))
      return false;
  }
  return true;
};

/**
 * A route between two points in a room that steers round the furniture: shortest
 * path over a 6" grid, then straightened wherever there's a clear line of sight.
 * Falls back to a straight line if there's no way through.
 */
const routeInRoom = (
  room: Room,
  world: WalkWorld,
  from: Point,
  to: Point,
): Point[] => {
  const clear = roomClearance(room, world);
  const lineClear = (a: Point, b: Point) => {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!clear({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }))
        return false;
    }
    return true;
  };
  if (lineClear(from, to)) return [to];

  const nodes = roomGrid(room).filter(clear);
  const key = (p: Point) => `${Math.round(p.x)},${Math.round(p.y)}`;
  const index = new Map(nodes.map((p, i) => [key(p), i]));
  const nearest = (p: Point) => {
    let best = -1;
    let bestD = Infinity;
    nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < bestD && lineClear(p, n)) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  const start = nearest(from);
  const goal = nearest(to);
  if (start < 0 || goal < 0) return [to];

  // Dijkstra over the 8-connected grid (rooms are small, so this is quick).
  const dist = new Array(nodes.length).fill(Infinity);
  const prev = new Array<number>(nodes.length).fill(-1);
  const done = new Array<boolean>(nodes.length).fill(false);
  dist[start] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === goal) break;
    done[u] = true;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const v = index.get(
        key({ x: nodes[u].x + dx * GRID, y: nodes[u].y + dy * GRID }),
      );
      if (v === undefined || done[v]) continue;
      const alt = dist[u] + Math.hypot(dx, dy);
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }
  if (dist[goal] === Infinity) return [to];

  const cells: Point[] = [];
  for (let at = goal; at >= 0; at = prev[at]) cells.unshift(nodes[at]);
  const raw = [from, ...cells, to];
  // Straighten: from each point jump to the furthest one in plain sight.
  const route: Point[] = [];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !lineClear(raw[i], raw[j])) j--;
    route.push(raw[j]);
    i = j;
  }
  return route;
};

/** Where to start walking and which way to face: outside the front door if there is one. */
export const findSpawn = (
  rooms: Room[],
  plot: PlotSize,
  world?: WalkWorld,
): { at: Point; yaw: number } => {
  const outside = passages(rooms).filter((p) => p.to === null);
  // Prefer a people door over a garage door.
  const front =
    outside.find((p) =>
      p.from.doors?.some(
        (d) => d.kind !== "overhead" && itemSegmentMid(p.from, d, p.mid),
      ),
    ) ?? outside[0];
  if (front) {
    const dx = front.mid.x - front.near.x;
    const dy = front.mid.y - front.near.y;
    const len = Math.hypot(dx, dy) || 1;
    const d = WALK.spawnDistance;
    return {
      at: { x: front.mid.x + (dx / len) * d, y: front.mid.y + (dy / len) * d },
      yaw: yawFor(-dx, -dy),
    };
  }
  const first = rooms.find((r) => !NO_OPENING_TYPES.includes(r.type));
  if (first) return { at: viewpoint(first, world), yaw: 0 };
  return {
    at: { x: plot.width / 2, y: plot.length + WALK.spawnDistance },
    yaw: 0,
  };
};

/** Is `mid` the middle of this door? (Used to tell which door a passage came from.) */
const itemSegmentMid = (
  room: Room,
  door: NonNullable<Room["doors"]>[number],
  mid: Point,
) => {
  const seg = itemSegment(room, door);
  const along = (seg.from + seg.to) / 2;
  return seg.orient === "h"
    ? Math.abs(along - mid.x) < 0.5 && Math.abs(seg.line - mid.y) < 0.5
    : Math.abs(along - mid.y) < 0.5 && Math.abs(seg.line - mid.x) < 0.5;
};

/** A point on the tour path. `roomId` marks a stop where the tour pauses. */
export interface TourStop extends Point {
  roomId?: string;
}

export interface TourPlan {
  start: { at: Point; yaw: number };
  path: TourStop[];
  /** Rooms that can't be reached through any door. */
  unreachable: number;
}

/**
 * A walking route through every room reachable by a door: in at the front door,
 * then depth-first room to room (back out the way it came), climbing any stairs last.
 */
export const planTour = (
  rooms: Room[],
  plot: PlotSize,
  furniture: Part[] = [],
): TourPlan => {
  const world = buildWalkWorld(rooms, plot, furniture);
  const start = findSpawn(rooms, plot, world);
  const all = passages(rooms);
  const path: TourStop[] = [{ ...start.at }];
  const visited = new Set<string>();
  const walkable = rooms.filter((r) => !NO_OPENING_TYPES.includes(r.type));

  /** Walk to `target` inside `room`, steering round its furniture. */
  const goTo = (room: Room, target: Point) => {
    const from = path[path.length - 1];
    path.push(...routeInRoom(room, world, from, target).map((p) => ({ ...p })));
  };

  const visit = (room: Room) => {
    visited.add(room.id);
    // Stop at the clear spot nearest the centre that can be reached from the doorway.
    const spot =
      room.type === "stairs"
        ? viewpoint(room, world)
        : reachableSpot(room, world, path[path.length - 1]);
    goTo(room, spot);
    path[path.length - 1].roomId = room.id;
    const exits = all
      .filter((p) => p.from.id === room.id && p.to)
      // Stairs last, so a tour of a house with stairs ends looking out from the top.
      .sort(
        (a, b) =>
          Number(a.to?.type === "stairs") - Number(b.to?.type === "stairs"),
      );
    for (const exit of exits) {
      const next = exit.to!;
      if (visited.has(next.id)) continue;
      // Doorways are reached from the room's clear spot, so routes start from open floor.
      const last = path[path.length - 1];
      if (last.x !== spot.x || last.y !== spot.y) goTo(room, spot);
      goTo(room, exit.near);
      path.push({ ...exit.mid }, { ...exit.far });
      visit(next);
      // Back out the same way, steering round the furniture in the room just seen.
      goTo(next, exit.far);
      path.push({ ...exit.mid }, { ...exit.near });
    }
  };

  const entrance = all.find(
    (p) =>
      p.to === null &&
      Math.hypot(p.mid.x - start.at.x, p.mid.y - start.at.y) <
        WALK.spawnDistance + 1,
  );
  if (entrance) {
    path.push(entrance.far, entrance.mid, entrance.near);
    visit(entrance.from);
  } else if (walkable[0]) {
    visit(walkable[0]);
  }

  // No need to walk all the way back out after the last room.
  const lastStop = path.findLastIndex((p) => p.roomId);
  return {
    start,
    path: lastStop >= 0 ? path.slice(0, lastStop + 1) : path,
    unreachable: walkable.filter((r) => !visited.has(r.id)).length,
  };
};

/** Room-centre (or stairs-top) spot for "go to room". */
export const roomViewpoint = viewpoint;
