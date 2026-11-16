import { IN_ROOM_STAIRS, STAIR_TREAD_IN } from "@/constants/floorPlan";
import {
  COLORS_3D,
  CUTAWAY_HEIGHT_IN,
  DOOR_HEIGHT_IN,
  DOOR_LEAF_THICKNESS_IN,
  GARAGE_DOOR_HEIGHT_IN,
  VENT_BOTTOM_IN,
  VENT_TOP_IN,
  WALL_HEIGHT_IN,
  WALL_THICKNESS_IN,
  WINDOW_HEAD_IN,
  WINDOW_SILL_IN,
} from "@/constants/view3d";
import type { Door, Room, Wall, WallItem } from "@/types/room";
import type { Part } from "./furniture";
import { hasWalls, inRoomStairsAsRoom, inRoomStairsFoot } from "./inRoomStairs";
import { stairsLayout } from "./stairs";

/**
 * Pure geometry for the 3D view. Everything here is in plan inches: x runs right,
 * y runs down the plan (becomes depth in 3D), z is height above the floor.
 * Boxes are given by their min/max corners so the renderer only has to convert units.
 */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

type Orientation = "h" | "v";

/** A stretch of wall in absolute plan coordinates. */
interface Segment {
  orient: Orientation;
  /** y for horizontal walls, x for vertical walls. */
  line: number;
  from: number;
  to: number;
}

/** A hole through a wall: horizontal extent along the wall, vertical extent in height. */
interface Opening extends Segment {
  bottom: number;
  top: number;
}

const orientOf = (wall: Wall): Orientation =>
  wall === "top" || wall === "bottom" ? "h" : "v";

/** Where a wall item sits in absolute plan coordinates. */
export const itemSegment = (
  room: Room,
  item: Pick<WallItem, "wall" | "offset" | "width">,
): Segment => {
  const orient = orientOf(item.wall);
  const line =
    item.wall === "top"
      ? room.y_position
      : item.wall === "bottom"
        ? room.y_position + room.length
        : item.wall === "left"
          ? room.x_position
          : room.x_position + room.width;
  const start = orient === "h" ? room.x_position : room.y_position;
  return {
    orient,
    line,
    from: start + item.offset,
    to: start + item.offset + item.width,
  };
};

/** Doorless openings (e.g. into a stairwell) run full height, so there's headroom on the stairs. */
const doorTop = (door: Door) =>
  door.kind === "overhead"
    ? GARAGE_DOOR_HEIGHT_IN
    : door.kind === "opening"
      ? WALL_HEIGHT_IN
      : DOOR_HEIGHT_IN;

/** Every opening in the plan — they cut through *any* room's wall on the same line. */
const collectOpenings = (rooms: Room[]): Opening[] =>
  rooms.flatMap((room) => [
    ...(room.doors ?? []).map((d) => ({
      ...itemSegment(room, d),
      bottom: 0,
      top: doorTop(d),
    })),
    ...(room.windows ?? []).map((w) => ({
      ...itemSegment(room, w),
      bottom: WINDOW_SILL_IN,
      top: WINDOW_HEAD_IN,
    })),
    ...(room.vents ?? []).map((v) => ({
      ...itemSegment(room, v),
      bottom: VENT_BOTTOM_IN,
      top: VENT_TOP_IN,
    })),
  ]);

/**
 * Turn a stretch of wall into a box. `side` is the slice of the wall's thickness, as
 * offsets across the wall line (e.g. [0, 2.5] is the half on the +x / +y side).
 */
const wallBox = (
  seg: Segment,
  from: number,
  to: number,
  z0: number,
  z1: number,
  [a, b]: [number, number],
): Box =>
  seg.orient === "h"
    ? { x0: from, x1: to, y0: seg.line + a, y1: seg.line + b, z0, z1 }
    : { x0: seg.line + a, x1: seg.line + b, y0: from, y1: to, z0, z1 };

/** A slab of wall and whose paint it carries: a room's inside, or the outside (null). */
export interface WallPiece {
  box: Box;
  roomId: string | null;
}

/** The half of a wall's thickness that faces into its room (or out of it). */
const halfOf = (wall: Wall, inside: boolean): [number, number] => {
  const h = WALL_THICKNESS_IN / 2;
  const intoRoomIsPositive = wall === "top" || wall === "left";
  const inner: [number, number] = intoRoomIsPositive ? [0, h] : [-h, 0];
  return inside ? inner : [-inner[1], -inner[0]];
};

/** Stretches of `from..to` not covered by any of `cover`. */
const subtract = (from: number, to: number, cover: [number, number][]) => {
  const out: [number, number][] = [];
  let cursor = from;
  for (const [a, b] of [...cover].sort((p, q) => p[0] - q[0])) {
    if (a > cursor) out.push([cursor, Math.min(a, to)]);
    cursor = Math.max(cursor, b);
    if (cursor >= to) break;
  }
  if (cursor < to) out.push([cursor, to]);
  return out.filter(([a, b]) => b - a > 0.01);
};

/**
 * Wall slabs for every room, with holes for doors, windows and vents. Each wall is
 * split down its thickness: the inside half carries the room's paint, so a wall
 * between two rooms shows each room's colour on its own side; wherever nothing is on
 * the other side, an outside half carries the exterior paint.
 */
export const buildWallPieces = (
  rooms: Room[],
  cutaway: boolean,
): WallPiece[] => {
  const height = cutaway ? CUTAWAY_HEIGHT_IN : WALL_HEIGHT_IN;
  const openings = collectOpenings(rooms);
  // Rooms with their walls turned off (gardens, shafts, open spaces) are open ground.
  const walled = rooms.filter(hasWalls);
  const pieces: WallPiece[] = [];
  const half = WALL_THICKNESS_IN / 2;

  const cut = (
    seg: Segment,
    from: number,
    to: number,
    side: [number, number],
    roomId: string | null,
  ) => {
    const holes = openings
      .filter(
        (o) =>
          o.orient === seg.orient &&
          Math.abs(o.line - seg.line) < 0.5 &&
          o.to > from &&
          o.from < to,
      )
      .map((o) => ({
        ...o,
        from: Math.max(o.from, from),
        to: Math.min(o.to, to),
      }))
      .sort((a, b) => a.from - b.from);
    const push = (a: number, b: number, z0: number, z1: number) =>
      pieces.push({ box: wallBox(seg, a, b, z0, z1, side), roomId });
    let cursor = from;
    for (const hole of holes) {
      if (hole.from > cursor) push(cursor, hole.from, 0, height);
      const start = Math.max(hole.from, cursor);
      if (hole.to > start) {
        if (hole.bottom > 0)
          push(start, hole.to, 0, Math.min(hole.bottom, height));
        if (hole.top < height) push(start, hole.to, hole.top, height);
      }
      cursor = Math.max(cursor, hole.to);
    }
    if (cursor < to) push(cursor, to, 0, height);
  };

  const segmentsOf = (room: Room) =>
    (["top", "bottom", "left", "right"] as Wall[]).map((wall) => ({
      wall,
      seg: itemSegment(room, {
        wall,
        offset: 0,
        width: wall === "top" || wall === "bottom" ? room.width : room.length,
      }),
    }));

  for (const room of walled) {
    for (const { wall, seg } of segmentsOf(room)) {
      cut(seg, seg.from, seg.to, halfOf(wall, true), room.id);
      // Outside face wherever no other room backs onto this wall.
      const covered = walled
        .filter((r) => r.id !== room.id)
        .flatMap(segmentsOf)
        .filter(
          (o) =>
            o.seg.orient === seg.orient &&
            Math.abs(o.seg.line - seg.line) < 0.5,
        )
        .map((o) => [o.seg.from, o.seg.to] as [number, number]);
      for (const [a, b] of subtract(seg.from, seg.to, covered)) {
        // Run on past an outside corner so the corner is closed.
        const from = a <= seg.from + 0.01 ? a - half : a;
        const to = b >= seg.to - 0.01 ? b + half : b;
        cut(seg, from, to, halfOf(wall, false), null);
      }
    }
  }
  return pieces.filter(
    ({ box: b }) => b.z1 > b.z0 && b.x1 > b.x0 && b.y1 > b.y0,
  );
};

/** Solid wall boxes (for collisions). */
export const buildWalls = (rooms: Room[], cutaway: boolean): Box[] =>
  buildWallPieces(rooms, cutaway).map((p) => p.box);

/**
 * Door leaves standing fully open, as in the 2D symbol: hinged at one jamb and
 * turned 90° into the room that owns the door. Openings and roll-up doors have none.
 */
export const buildDoorLeaves = (rooms: Room[]): Box[] =>
  rooms.flatMap((room) =>
    (room.doors ?? [])
      .filter((d) => (d.kind ?? "swing") === "swing")
      .filter((d) => onSomeWall(rooms, itemSegment(room, d)))
      .map((door) => {
        const seg = itemSegment(room, door);
        // Which jamb the hinge is on matches the rotated 2D symbol (see DoorSymbol).
        const hingeAtStart =
          { top: true, left: false, bottom: false, right: true }[door.wall] !==
          !!door.flip;
        const hinge = hingeAtStart ? seg.from : seg.to;
        const inward = door.wall === "top" || door.wall === "left" ? 1 : -1;
        const t = DOOR_LEAF_THICKNESS_IN / 2;
        const reach = seg.line + inward * door.width;
        const [a, b] = [Math.min(seg.line, reach), Math.max(seg.line, reach)];
        const z1 = DOOR_HEIGHT_IN - 1;
        return seg.orient === "h"
          ? { x0: hinge - t, x1: hinge + t, y0: a, y1: b, z0: 0, z1 }
          : { x0: a, x1: b, y0: hinge - t, y1: hinge + t, z0: 0, z1 };
      }),
  );

/** Trim boxes to a maximum height (for cut-away mode), dropping any left empty. */
export const clipToHeight = (boxes: Box[], cutaway: boolean): Box[] =>
  cutaway
    ? boxes
        .map((b) => ({ ...b, z1: Math.min(b.z1, CUTAWAY_HEIGHT_IN) }))
        .filter((b) => b.z1 > b.z0)
    : boxes;

/** Thin panes filling window and vent openings. */
export const buildPanes = (rooms: Room[], kind: "windows" | "vents"): Box[] =>
  rooms.flatMap((room) =>
    (room[kind] ?? [])
      .filter((item) => onSomeWall(rooms, itemSegment(room, item)))
      .map((item) => {
        const seg = itemSegment(room, item);
        const [z0, z1] =
          kind === "windows"
            ? [WINDOW_SILL_IN, WINDOW_HEAD_IN]
            : [VENT_BOTTOM_IN, VENT_TOP_IN];
        const half = kind === "windows" ? 0.5 : 1.5;
        return seg.orient === "h"
          ? {
              x0: seg.from,
              x1: seg.to,
              y0: seg.line - half,
              y1: seg.line + half,
              z0,
              z1,
            }
          : {
              x0: seg.line - half,
              x1: seg.line + half,
              y0: seg.from,
              y1: seg.to,
              z0,
              z1,
            };
      }),
  );

/**
 * Steps for a straight flight, rising from the foot (the wall with the stairs' opening)
 * to full wall height, so the flight visibly leads to the next floor.
 */
export const buildStairs = (room: Room): Box[] => {
  const { vertical, foot } = stairsLayout(
    room.width,
    room.length,
    room.doors?.[0]?.wall,
  );
  const run = vertical ? room.length : room.width;
  const steps = Math.max(2, Math.floor(run / STAIR_TREAD_IN));
  const tread = run / steps;
  const rise = WALL_HEIGHT_IN / steps;
  // Steps climb away from the foot wall.
  const fromFar = vertical ? foot === "bottom" : foot === "right";
  return Array.from({ length: steps }, (_, i) => {
    const index = fromFar ? steps - 1 - i : i; // position along the run, measured from the start
    const a = (vertical ? room.y_position : room.x_position) + index * tread;
    const z1 = (i + 1) * rise;
    return vertical
      ? {
          x0: room.x_position,
          x1: room.x_position + room.width,
          y0: a,
          y1: a + tread,
          z0: 0,
          z1,
        }
      : {
          x0: a,
          x1: a + tread,
          y0: room.y_position,
          y1: room.y_position + room.length,
          z0: 0,
          z1,
        };
  });
};

/** Whether a wall item sits in some room's actual wall (not in a wall-less room's edge). */
const onSomeWall = (rooms: Room[], seg: Segment): boolean => {
  const mid = (seg.from + seg.to) / 2;
  return rooms.filter(hasWalls).some((r) =>
    (["top", "bottom", "left", "right"] as Wall[]).some((wall) => {
      const s = itemSegment(r, {
        wall,
        offset: 0,
        width: wall === "top" || wall === "bottom" ? r.width : r.length,
      });
      return (
        s.orient === seg.orient &&
        Math.abs(s.line - seg.line) < 0.5 &&
        mid > s.from &&
        mid < s.to
      );
    }),
  );
};

/** Stairs built inside rooms: what's drawn, what you stand on, what you bump into. */
export interface InRoomStairsGeometry {
  steps: Box[];
  /** Railings and under-stair cupboard doors. */
  parts: Part[];
  /** Invisible barriers along the open side (and open top), so you can't step off. */
  guards: Box[];
}

export const buildInRoomStairs = (rooms: Room[]): InRoomStairsGeometry => {
  const out: InRoomStairsGeometry = { steps: [], parts: [], guards: [] };
  for (const room of rooms) {
    const s = room.stairs;
    if (!s) continue;
    const flight = inRoomStairsAsRoom(room, s);
    const steps = buildStairs(flight);
    out.steps.push(...steps);

    // Measure along the run from the foot (u), and outwards from the open side (p).
    const foot = inRoomStairsFoot(s);
    const { x_position: x0, y_position: y0 } = flight;
    const x1 = x0 + flight.width;
    const y1 = y0 + flight.length;
    const alongX = s.wall === "top" || s.wall === "bottom";
    const n = steps.length;
    const tread = s.run / n;
    const rise = WALL_HEIGHT_IN / n;
    const along = (u: number) =>
      foot === "left"
        ? x0 + u
        : foot === "right"
          ? x1 - u
          : foot === "top"
            ? y0 + u
            : y1 - u;
    // The open side faces into the room, away from the wall the flight backs onto.
    const edge = { top: y1, bottom: y0, left: x1, right: x0 }[s.wall];
    const outward = s.wall === "top" || s.wall === "left" ? 1 : -1;
    const box = (
      u0: number,
      u1: number,
      p0: number,
      p1: number,
      z0: number,
      z1: number,
    ): Box => {
      const [a, b] = [along(u0), along(u1)].sort((m, k) => m - k);
      const [c, d] = [edge + outward * p0, edge + outward * p1].sort(
        (m, k) => m - k,
      );
      return alongX
        ? { x0: a, x1: b, y0: c, y1: d, z0, z1 }
        : { x0: c, x1: d, y0: a, y1: b, z0, z1 };
    };
    const part = (b: Box, color: string): Part => ({ box: b, color });

    // Railing along the open side: a handrail following the steps, posts every other step.
    for (let i = 0; i < n; i++) {
      const top = (i + 1) * rise;
      out.parts.push(
        part(
          box(i * tread, (i + 1) * tread, -2, -0.5, top + 34, top + 36),
          COLORS_3D.railing,
        ),
      );
      if (i % 2 === 1 || i === n - 1)
        out.parts.push(
          part(
            box(
              (i + 0.5) * tread - 0.75,
              (i + 0.5) * tread + 0.75,
              -2,
              -0.5,
              top,
              top + 35,
            ),
            COLORS_3D.railing,
          ),
        );
    }
    out.guards.push(box(0, s.run, -1.5, 0, 0, Infinity));

    // Across the top too, unless the flight runs into a wall there.
    const wallLen = alongX ? room.width : room.length;
    const topAtWall = s.reverse
      ? s.offset <= 0.5
      : s.offset + s.run >= wallLen - 0.5;
    if (!topAtWall) {
      const [w0, w1] = [-s.width, 0];
      const topBox = (z0: number, z1: number): Box => {
        const end = along(s.run);
        const [c, d] = [edge + outward * w0, edge + outward * w1].sort(
          (m, k) => m - k,
        );
        const [a, b] = [
          end - (foot === "left" || foot === "top" ? 1.5 : 0),
          end + (foot === "left" || foot === "top" ? 0 : 1.5),
        ];
        return alongX
          ? { x0: a, x1: b, y0: c, y1: d, z0, z1 }
          : { x0: c, x1: d, y0: a, y1: b, z0, z1 };
      };
      out.parts.push(
        part(
          topBox(WALL_HEIGHT_IN + 34, WALL_HEIGHT_IN + 36),
          COLORS_3D.railing,
        ),
      );
      out.guards.push(topBox(0, Infinity));
    }

    // Under-stair storage: cupboard doors on the open side wherever there's headroom.
    const w = IN_ROOM_STAIRS.storageDoorWidth;
    for (let u = s.run; u - w >= 0; u -= w) {
      const lowest = (Math.floor((u - w) / tread) + 1) * rise; // lowest step over this door
      const z1 = lowest - 4;
      if (z1 < IN_ROOM_STAIRS.storageMinHeight) break;
      out.parts.push(
        part(box(u - w + 0.5, u - 0.5, 0, 0.75, 2, z1), COLORS_3D.storageDoor),
      );
      out.parts.push(
        part(
          box(u - w + 3, u - w + 4.5, 0.75, 1.75, z1 / 2 - 3, z1 / 2 + 3),
          COLORS_3D.handle,
        ),
      );
    }
  }
  return out;
};
