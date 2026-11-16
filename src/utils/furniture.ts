import { FURNITURE, FURNITURE_COLORS as C } from "@/constants/view3d";
import type { Room, Wall } from "@/types/room";
import { IN_ROOM_STAIRS } from "@/constants/floorPlan";
import { inRoomStairsFoot, inRoomStairsRect } from "./inRoomStairs";
import { itemSegment, type Box } from "./scene3d";

/**
 * Furniture and fittings for the 3D view, laid out automatically per room type.
 * Everything is in plan inches (x right, y down the plan, z up), like scene3d.ts.
 *
 * Each piece is drawn in a wall-relative frame: `u` runs along the wall it backs onto,
 * `v` is the distance into the room from that wall. A piece is tried against each wall
 * (and at a few spots along it) until it fits without blocking a doorway, covering a
 * window (for tall pieces) or bumping into anything already placed.
 */

/** cylX / cylY: lying along plan x / plan y (wheels). cyl: standing upright. */
export type PartShape = "box" | "cyl" | "cylX" | "cylY" | "sphere";

export interface Part {
  box: Box;
  color: string;
  shape?: PartShape;
  opacity?: number;
  /** You can walk over or under it (rugs, tree canopies). */
  walkThrough?: boolean;
  /** Which piece of furniture it belongs to, and in which room. */
  piece?: FurnitureKey;
  roomId?: string;
}

/** Named pieces of furniture, which can be removed room by room. */
export const FURNITURE_KEYS = [
  "bed",
  "wardrobe",
  "desk",
  "sofa",
  "armchair",
  "bookshelf",
  "floor_lamp",
  "tv",
  "dining_table",
  "sideboard",
  "fridge",
  "counters",
  "island",
  "bath",
  "toilet",
  "vanity",
  "car",
  "shelving",
  "workbench",
  "rug",
  "console",
  "tree",
  "bench",
  "flower_bed",
  "plant",
  "wall_art",
] as const;
export type FurnitureKey = (typeof FURNITURE_KEYS)[number];

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const overlaps = (a: Rect, b: Rect, margin = 0) =>
  a.x0 < b.x1 + margin &&
  a.x1 + margin > b.x0 &&
  a.y0 < b.y1 + margin &&
  a.y1 + margin > b.y0;

const WALLS: Wall[] = ["top", "right", "bottom", "left"];
const OPPOSITE: Record<Wall, Wall> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/** A room seen from one of its walls. */
interface Frame {
  wall: Wall;
  /** Wall length, and the room's depth away from it. */
  L: number;
  D: number;
  alongIsX: boolean;
  rect: (u0: number, u1: number, v0: number, v1: number) => Rect;
}

const frameOf = (room: Room, wall: Wall): Frame => {
  const { x_position: rx, y_position: ry, width: W, length: H } = room;
  const alongIsX = wall === "top" || wall === "bottom";
  const rect = (u0: number, u1: number, v0: number, v1: number): Rect => {
    switch (wall) {
      case "top":
        return { x0: rx + u0, x1: rx + u1, y0: ry + v0, y1: ry + v1 };
      case "bottom":
        return { x0: rx + u0, x1: rx + u1, y0: ry + H - v1, y1: ry + H - v0 };
      case "left":
        return { x0: rx + v0, x1: rx + v1, y0: ry + u0, y1: ry + u1 };
      case "right":
        return { x0: rx + W - v1, x1: rx + W - v0, y0: ry + u0, y1: ry + u1 };
    }
  };
  return { wall, alongIsX, L: alongIsX ? W : H, D: alongIsX ? H : W, rect };
};

/** Local shapes: cylU / cylV lie along / across the wall. */
type LocalShape = "box" | "cyl" | "sphere" | "cylU" | "cylV";
interface PartOptions {
  shape?: LocalShape;
  opacity?: number;
  walkThrough?: boolean;
}
/** Draws one part relative to a piece's centre on the wall (du) and its back (dv). */
type Pen = (
  du0: number,
  du1: number,
  dv0: number,
  dv1: number,
  z0: number,
  z1: number,
  color: string,
  options?: PartOptions,
) => void;

const penFor =
  (f: Frame, uc: number, v0: number, out: Part[]): Pen =>
  (du0, du1, dv0, dv1, z0, z1, color, { shape = "box", ...rest } = {}) => {
    const resolved: PartShape =
      shape === "cylU"
        ? f.alongIsX
          ? "cylX"
          : "cylY"
        : shape === "cylV"
          ? f.alongIsX
            ? "cylY"
            : "cylX"
          : shape;
    out.push({
      box: { ...f.rect(uc + du0, uc + du1, v0 + dv0, v0 + dv1), z0, z1 },
      color,
      shape: resolved,
      ...rest,
    });
  };

interface Spec {
  /** Footprint along the wall (w) and into the room (d). */
  w: number;
  d: number;
  /** "wall": backs onto a wall; "corner": in a corner; "center": free-standing. */
  anchor?: "wall" | "corner" | "center";
  walls?: Wall[];
  /** Explicit centres along the wall to try. */
  u?: number[];
  /** Distance from the wall (default: right against it, or centred for "center"). */
  v0?: number;
  /** "avoid": never in front of a window; "prefer": only if there's nowhere else. */
  windows?: "avoid" | "prefer";
  /** Space kept free around it. */
  clearance?: number;
  /** Doesn't take up floor space (rugs, wall art). */
  overlay?: boolean;
  draw: (pen: Pen) => void;
}

interface Ctx {
  room: Room;
  /** Pieces the user removed from this room. */
  hidden: Set<string>;
  /** Keep hidden pieces anyway (to list what a room could have). */
  keepHidden: boolean;
  /** Every piece placed, in order (for listing). */
  placements: { roomId: string; key: FurnitureKey }[];
  doorZones: Rect[];
  windowZones: Rect[];
  placed: Rect[];
  parts: Part[];
}

const INSET = FURNITURE.inset;
/** Walkway kept beside free-standing pieces. */
const AISLE = 24;

/** Walls ordered by how good they are to put furniture against: no doors, longest. */
const wallsByPreference = (ctx: Ctx): Wall[] =>
  [...WALLS]
    .map((wall) => {
      const f = frameOf(ctx.room, wall);
      const band = f.rect(0, f.L, 0, 30);
      const doors = ctx.doorZones.filter((z) => overlaps(band, z)).length;
      const windows = ctx.windowZones.filter((z) => overlaps(band, z)).length;
      return { wall, score: doors * 1000 + windows * 10 - f.L / 100 };
    })
    .sort((a, b) => a.score - b.score)
    .map((w) => w.wall);

/** Try to place a piece; returns the wall it went against, or null if it didn't fit. */
const placeSpec = (ctx: Ctx, spec: Spec): Wall | null => {
  const passes: boolean[] =
    spec.windows === "avoid"
      ? [true]
      : spec.windows === "prefer"
        ? [true, false]
        : [false];
  for (const avoidWindows of passes) {
    for (const wall of spec.walls ?? wallsByPreference(ctx)) {
      const f = frameOf(ctx.room, wall);
      const { w, d } = spec;
      if (w + 2 * INSET > f.L || d + 2 * INSET > f.D) continue;
      const anchor = spec.anchor ?? "wall";
      const us =
        spec.u ??
        (anchor === "corner"
          ? [w / 2 + INSET, f.L - w / 2 - INSET]
          : anchor === "center"
            ? [f.L / 2, f.L / 2 - f.L / 6, f.L / 2 + f.L / 6]
            : [
                f.L / 2,
                w / 2 + INSET,
                f.L - w / 2 - INSET,
                f.L / 3,
                (2 * f.L) / 3,
              ]);
      const v0 = spec.v0 ?? (anchor === "center" ? (f.D - d) / 2 : INSET);
      // Free-standing pieces leave a walkway on both long sides.
      if (anchor === "center" && spec.v0 === undefined && v0 - INSET < AISLE)
        continue;
      for (const u of us) {
        if (u - w / 2 < INSET - 0.01 || u + w / 2 > f.L - INSET + 0.01)
          continue;
        const r = f.rect(u - w / 2, u + w / 2, v0, v0 + d);
        const gap = spec.clearance ?? 2;
        if (ctx.doorZones.some((z) => overlaps(r, z))) continue;
        if (avoidWindows && ctx.windowZones.some((z) => overlaps(r, z)))
          continue;
        if (!spec.overlay && ctx.placed.some((p) => overlaps(r, p, gap)))
          continue;
        spec.draw(penFor(f, u, v0, ctx.parts));
        if (!spec.overlay) ctx.placed.push(r);
        return wall;
      }
    }
  }
  return null;
};

/** Place the first variant that fits. */
/**
 * Draw one named piece. A piece the user removed still takes its place (so the rest
 * of the room stays where it was) but leaves nothing behind.
 */
const piece = <T>(ctx: Ctx, key: FurnitureKey, draw: () => T): T => {
  const start = ctx.parts.length;
  const result = draw();
  if (ctx.parts.length > start)
    ctx.placements.push({ roomId: ctx.room.id, key });
  for (let i = start; i < ctx.parts.length; i++)
    ctx.parts[i] = { ...ctx.parts[i], piece: key, roomId: ctx.room.id };
  if (!ctx.keepHidden && ctx.hidden.has(key)) ctx.parts.length = start;
  return result;
};

const place = (ctx: Ctx, spec: Spec, key: FurnitureKey): Wall | null =>
  piece(ctx, key, () => placeSpec(ctx, spec));

const placeAny = (ctx: Ctx, specs: Spec[], key: FurnitureKey): Wall | null =>
  piece(ctx, key, () => placeAnySpec(ctx, specs));

const placeAnySpec = (ctx: Ctx, specs: Spec[]): Wall | null => {
  for (const spec of specs) {
    const wall = placeSpec(ctx, spec);
    if (wall) return wall;
  }
  return null;
};

/** Free stretches along a wall, `depth` deep, not blocked by doors or placed pieces. */
const freeRuns = (
  ctx: Ctx,
  f: Frame,
  depth: number,
  blockers: Rect[],
): [number, number][] => {
  const band = f.rect(0, f.L, INSET, INSET + depth);
  const origin = f.rect(0, 0, 0, 0);
  const blocked = blockers
    .filter((r) => overlaps(band, r))
    .map((r) =>
      f.alongIsX
        ? [r.x0 - origin.x0, r.x1 - origin.x0]
        : [r.y0 - origin.y0, r.y1 - origin.y0],
    )
    .sort((a, b) => a[0] - b[0]);
  const runs: [number, number][] = [];
  let cursor: number = INSET;
  for (const [a, b] of blocked) {
    if (a - 1 > cursor) runs.push([cursor, a - 1]);
    cursor = Math.max(cursor, b + 1);
  }
  if (f.L - INSET > cursor) runs.push([cursor, f.L - INSET]);
  return runs;
};

// ---------------------------------------------------------------------------
// Pieces. In each draw: du runs across the piece (-w/2..w/2), dv from its back (0..d).
// ---------------------------------------------------------------------------

/** A simple chair; `back` says which side its backrest is on. */
const chair = (
  pen: Pen,
  cu: number,
  cv: number,
  back: "near" | "far" | "left" | "right",
  color: string = C.wood,
) => {
  const s = 9;
  pen(cu - s, cu + s, cv - s, cv + s, 16, 18.5, color);
  for (const [a, b] of [
    [-s, -s + 1.5],
    [s - 1.5, s],
  ])
    for (const [c, d] of [
      [-s, -s + 1.5],
      [s - 1.5, s],
    ])
      pen(cu + a, cu + b, cv + c, cv + d, 0, 16, color);
  const [u0, u1, v0, v1] =
    back === "near"
      ? [-s, s, -s, -s + 2]
      : back === "far"
        ? [-s, s, s - 2, s]
        : back === "left"
          ? [-s, -s + 2, -s, s]
          : [s - 2, s, -s, s];
  pen(cu + u0, cu + u1, cv + v0, cv + v1, 18.5, 36, color);
};

const legs = (
  pen: Pen,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  z: number,
  color: string,
) => {
  for (const u of [u0, u1 - 2])
    for (const v of [v0, v1 - 2]) pen(u, u + 2, v, v + 2, 0, z, color);
};

const plant = (): Spec => ({
  w: 18,
  d: 18,
  anchor: "corner",
  draw: (pen) => {
    pen(-6, 6, 3, 15, 0, 14, C.pot, { shape: "cyl" });
    pen(-10, 10, -1, 19, 12, 40, C.leaf, { shape: "sphere" });
    pen(-6, 7, 2, 14, 32, 48, C.leafLight, { shape: "sphere" });
  },
});

const floorLamp = (): Spec => ({
  w: 16,
  d: 16,
  anchor: "corner",
  draw: (pen) => {
    pen(-6, 6, 2, 14, 0, 1.5, C.metal, { shape: "cyl" });
    pen(-0.75, 0.75, 7.25, 8.75, 1.5, 58, C.metal);
    pen(-8, 8, 0, 16, 56, 68, C.lampShade, { shape: "cyl" });
  },
});

const wallArt = (color: string, w = 30): Spec => ({
  w,
  d: 1.5,
  overlay: true,
  windows: "avoid",
  draw: (pen) => {
    pen(-w / 2, w / 2, 0, 1.2, 46, 70, C.woodDark);
    pen(-w / 2 + 2, w / 2 - 2, 1.2, 1.5, 48, 68, color);
  },
});

const sofa =
  (w: number, color: string = C.fabric) =>
  (pen: Pen, dv = 0) => {
    const d = 36;
    pen(-w / 2, w / 2, dv, dv + d, 0, 16, color);
    pen(-w / 2, w / 2, dv, dv + 9, 16, 34, color);
    pen(-w / 2, -w / 2 + 6, dv, dv + d, 16, 25, color);
    pen(w / 2 - 6, w / 2, dv, dv + d, 16, 25, color);
    const n = w > 70 ? 3 : 2;
    const cw = (w - 12) / n;
    for (let i = 0; i < n; i++) {
      const a = -w / 2 + 6 + i * cw;
      pen(a + 0.5, a + cw - 0.5, dv + 9, dv + d - 1, 16, 20, C.cushion);
      pen(a + 1, a + cw - 1, dv + 9, dv + 13, 20, 31, C.cushion);
    }
  };

const coffeeTable = (pen: Pen, v: number, w = 48) => {
  pen(-w / 2, w / 2, v, v + 22, 15, 17, C.wood);
  legs(pen, -w / 2 + 1, w / 2 - 1, v + 1, v + 21, 15, C.woodDark);
};

/** Sofa, with a coffee table and rug in front when there's room. */
const sofaSet = (walls?: Wall[]): Spec[] => [
  {
    w: 100,
    d: 80,
    walls,
    clearance: 6,
    draw: (pen) => {
      pen(-50, 50, 26, 80, 0, 0.4, C.rug, { walkThrough: true });
      sofa(84)(pen);
      coffeeTable(pen, 52);
    },
  },
  { w: 84, d: 36, walls, draw: (pen) => sofa(84)(pen) },
  { w: 60, d: 36, walls, draw: (pen) => sofa(60)(pen) },
];

const armchair = (): Spec => ({
  w: 32,
  d: 32,
  draw: (pen) => {
    pen(-16, 16, 0, 32, 0, 15, C.armchair);
    pen(-16, 16, 0, 8, 15, 32, C.armchair);
    pen(-16, -11, 0, 32, 15, 23, C.armchair);
    pen(11, 16, 0, 32, 15, 23, C.armchair);
    pen(-11, 11, 8, 31, 15, 18, C.cushion);
  },
});

const bookshelf = (): Spec => ({
  w: 36,
  d: 12,
  windows: "avoid",
  draw: (pen) => {
    pen(-18, 18, 0, 1, 0, 72, C.wood);
    pen(-18, -16.5, 0, 12, 0, 72, C.wood);
    pen(16.5, 18, 0, 12, 0, 72, C.wood);
    [0, 18, 36, 54, 70.5].forEach((z) =>
      pen(-18, 18, 0, 12, z, z + 1.5, C.wood),
    );
    [1.5, 19.5, 37.5, 55.5].forEach((z, row) => {
      let u = -16;
      const widths = [3, 2, 4, 2.5, 3, 2, 3.5, 2.5, 3, 2, 3];
      widths.forEach((bw, i) => {
        const h = 10 + ((i + row) % 3) * 2;
        if (u + bw <= 16)
          pen(u, u + bw, 2, 10, z, z + h, C.books[(i + row) % C.books.length]);
        u += bw + 0.3;
      });
    });
  },
});

const bed = (w: number, len: number, nightstands: boolean): Spec => ({
  w: nightstands ? w + 44 : w,
  d: len + 3,
  windows: "prefer",
  clearance: 4,
  draw: (pen) => {
    pen(-w / 2, w / 2, 0, 3, 0, 44, C.bedFrame);
    pen(-w / 2, w / 2, 3, 3 + len, 4, 14, C.bedFrame);
    pen(-w / 2 + 1, w / 2 - 1, 4, 2 + len, 14, 23, C.sheet);
    pen(
      -w / 2 + 0.5,
      w / 2 - 0.5,
      3 + len * 0.32,
      3 + len + 0.5,
      20,
      24,
      C.duvet,
    );
    if (w >= 50) {
      pen(-w / 2 + 4, -2, 5, 19, 23, 28, C.pillow);
      pen(2, w / 2 - 4, 5, 19, 23, 28, C.pillow);
    } else pen(-w / 2 + 4, w / 2 - 4, 5, 19, 23, 28, C.pillow);
    if (!nightstands) return;
    for (const side of [-1, 1]) {
      const c = side * (w / 2 + 12);
      pen(c - 9, c + 9, 0, 18, 0, 24, C.wood);
      pen(c - 7, c + 7, 17.9, 18.3, 14, 15, C.woodDark);
      pen(c - 3, c + 3, 6, 12, 24, 36, C.metal, { shape: "cyl" });
      pen(c - 6, c + 6, 3, 15, 36, 46, C.lampShade, { shape: "cyl" });
    }
  },
});

const wardrobe = (w: number): Spec => ({
  w,
  d: 24,
  windows: "avoid",
  draw: (pen) => {
    pen(-w / 2, w / 2, 0, 24, 0, 84, C.wood);
    pen(-0.4, 0.4, 24, 24.4, 4, 80, C.woodDark);
    pen(-3, -1.5, 24, 25.5, 40, 48, C.metal);
    pen(1.5, 3, 24, 25.5, 40, 48, C.metal);
  },
});

const desk = (): Spec => ({
  w: 42,
  d: 46,
  clearance: 4,
  windows: "prefer",
  draw: (pen) => {
    pen(-21, 21, 0, 22, 28.5, 30, C.woodLight);
    pen(-21, -19.5, 0, 22, 0, 28.5, C.woodLight);
    pen(19.5, 21, 0, 22, 0, 28.5, C.woodLight);
    pen(-8, 8, 2, 4, 30, 31, C.applianceDark);
    pen(-9, 9, 2, 3, 31, 42, C.screen);
    chair(pen, 0, 32, "far", C.applianceDark);
  },
});

const tvUnit = (): Spec => ({
  w: 66,
  d: 18,
  windows: "avoid",
  draw: (pen) => {
    pen(-33, 33, 0, 18, 0, 20, C.woodDark);
    pen(-33, 33, 0, 18.5, 20, 21, C.wood);
    pen(-16, 16, 8, 12, 21, 23.5, C.applianceDark);
    pen(-29, 29, 0.5, 2, 30, 63, C.applianceDark);
    pen(-28, 28, 2, 2.4, 31, 62, C.screen);
  },
});

const sideboard = (): Spec => ({
  w: 54,
  d: 18,
  draw: (pen) => {
    pen(-27, 27, 0, 18, 3, 32, C.woodDark);
    pen(-27.5, 27.5, 0, 18.5, 32, 33.5, C.wood);
    pen(-0.4, 0.4, 18, 18.4, 6, 30, C.wood);
    pen(14, 20, 6, 12, 33.5, 44, C.glass, { shape: "cyl" });
  },
});

/** Dining table with chairs all round; `len` runs along the frame's wall. */
const diningTable = (
  len: number,
  depth: number,
  perSide: number,
  ends: boolean,
  walls: Wall[],
  /** Pushed against a wall, with chairs only on the open sides (small rooms). */
  againstWall = false,
): Spec => {
  // Chairs are tucked in, sticking out 14" past the table.
  const w = len + (ends ? 28 : 0);
  return {
    w,
    d: depth + (againstWall ? 14 : 28),
    anchor: againstWall ? "wall" : "center",
    walls: againstWall ? undefined : walls,
    clearance: 6,
    draw: (pen) => {
      const v0 = againstWall ? 0 : 14;
      pen(-len / 2, len / 2, v0, v0 + depth, 28.5, 30, C.wood);
      legs(
        pen,
        -len / 2 + 2,
        len / 2 - 2,
        v0 + 2,
        v0 + depth - 2,
        28.5,
        C.woodDark,
      );
      for (let i = 0; i < perSide; i++) {
        const u = -len / 2 + (len * (i + 0.5)) / perSide;
        if (!againstWall) chair(pen, u, v0 - 5, "near");
        chair(pen, u, v0 + depth + 5, "far");
      }
      if (ends) {
        chair(pen, -len / 2 - 5, v0 + depth / 2, "left");
        chair(pen, len / 2 + 5, v0 + depth / 2, "right");
      }
    },
  };
};

const fridge = (): Spec => ({
  w: 32,
  d: 30,
  anchor: "corner",
  windows: "avoid",
  draw: (pen) => {
    pen(-16, 16, 0, 30, 0, 70, C.appliance);
    pen(-16, 16, 30, 30.4, 46, 46.6, C.metal);
    pen(10, 11.5, 30, 31.5, 50, 62, C.metal);
    pen(10, 11.5, 30, 31.5, 22, 40, C.metal);
  },
});

const toilet = (): Spec => ({
  w: 20,
  d: 30,
  clearance: 6,
  draw: (pen) => {
    pen(-9, 9, 0, 8, 14, 30, C.porcelain);
    pen(-7, 7, 8, 27, 0, 15, C.porcelain, { shape: "cyl" });
    pen(-8, 8, 8, 28, 15, 16.5, C.marble, { shape: "cyl" });
    pen(-4, -1, 2, 5, 30, 31, C.metal);
  },
});

const vanity = (w: number): Spec => ({
  w,
  d: 21,
  windows: "prefer",
  draw: (pen) => {
    pen(-w / 2, w / 2, 0, 21, 0, 32, C.cabinet);
    pen(-w / 2 - 0.5, w / 2 + 0.5, 0, 21.5, 32, 34, C.marble);
    pen(-9, 9, 4, 17, 33.6, 34.6, C.basin, { shape: "cyl" });
    pen(-1, 1, 1.5, 4.5, 34, 40, C.metal);
    pen(-12, 12, 0, 0.8, 44, 72, C.glass);
  },
});

const shower = (): Spec => ({
  w: 36,
  d: 36,
  anchor: "corner",
  draw: (pen) => {
    pen(-18, 18, 0, 36, 0, 3, C.porcelain);
    pen(-18, 18, 35.5, 36, 3, 78, C.glass, { opacity: 0.3 });
    pen(-18, -17.5, 0, 36, 3, 78, C.glass, { opacity: 0.3 });
    pen(17.5, 18, 0, 36, 3, 78, C.glass, { opacity: 0.3 });
    pen(-0.5, 0.5, 0, 2, 40, 74, C.metal);
    pen(-3, 3, 2, 8, 72, 74, C.metal, { shape: "cyl" });
  },
});

const bathtub = (): Spec => ({
  w: 60,
  d: 30,
  anchor: "corner",
  draw: (pen) => {
    pen(-30, 30, 0, 30, 0, 20, C.porcelain);
    pen(-27, 27, 3, 27, 19.6, 20.2, C.water, { opacity: 0.8 });
    pen(-27, -24, 1, 4, 20, 27, C.metal);
  },
});

const car = (len: number, walls: Wall[], u: number[], v0: number): Spec => ({
  w: 72,
  d: len,
  walls,
  u,
  v0,
  draw: (pen) => {
    pen(-35, 35, 0, len, 9, 33, C.car);
    pen(-31, 31, len * 0.3, len * 0.72, 33, 52, C.carGlass);
    pen(-29, 29, len * 0.36, len * 0.68, 52, 54, C.car);
    for (const v of [len * 0.17, len * 0.8]) {
      pen(-36, -28, v - 12, v + 12, 0, 24, C.tire, { shape: "cylU" });
      pen(28, 36, v - 12, v + 12, 0, 24, C.tire, { shape: "cylU" });
    }
    pen(-30, -20, len - 0.5, len + 0.5, 25, 30, C.headlight);
    pen(20, 30, len - 0.5, len + 0.5, 25, 30, C.headlight);
    pen(-30, -22, -0.5, 0.5, 25, 30, C.taillight);
    pen(22, 30, -0.5, 0.5, 25, 30, C.taillight);
  },
});

const shelving = (): Spec => ({
  w: 48,
  d: 16,
  windows: "avoid",
  draw: (pen) => {
    for (const u of [-24, 22.5])
      for (const v of [0, 14.5]) pen(u, u + 1.5, v, v + 1.5, 0, 72, C.metal);
    [2, 24, 46, 70].forEach((z, i) => {
      pen(-24, 24, 0, 16, z, z + 1, C.metal);
      if (i < 3) {
        pen(-20, -6, 2, 14, z + 1, z + 12, C.box);
        pen(4, 20, 2, 14, z + 1, z + 9, C.box);
      }
    });
  },
});

const workbench = (): Spec => ({
  w: 60,
  d: 24,
  windows: "prefer",
  draw: (pen) => {
    pen(-30, 30, 0, 24, 34, 36, C.wood);
    legs(pen, -29, 29, 1, 23, 34, C.woodDark);
    pen(-29, 29, 1, 23, 8, 9, C.woodDark);
    pen(-30, 30, 0, 0.8, 44, 70, C.pegboard);
  },
});

const consoleTable = (): Spec => ({
  w: 36,
  d: 12,
  draw: (pen) => {
    pen(-18, 18, 0, 12, 28.5, 30, C.woodDark);
    legs(pen, -17, 17, 0.5, 11.5, 28.5, C.woodDark);
    pen(10, 15, 3, 8, 30, 40, C.pot, { shape: "cyl" });
  },
});

const tree = (): Spec => ({
  w: 40,
  d: 40,
  anchor: "corner",
  clearance: 16,
  draw: (pen) => {
    pen(-4, 4, 16, 24, 0, 64, C.trunk, { shape: "cyl" });
    pen(-24, 24, -4, 44, 52, 104, C.leaf, {
      shape: "sphere",
      walkThrough: true,
    });
    pen(-16, 14, 4, 34, 84, 116, C.leafLight, {
      shape: "sphere",
      walkThrough: true,
    });
  },
});

const bench = (): Spec => ({
  w: 48,
  d: 20,
  draw: (pen) => {
    pen(-24, 24, 2, 20, 16, 18, C.wood);
    pen(-24, 24, 0, 2, 18, 32, C.wood);
    for (const u of [-22, 20]) pen(u, u + 2, 2, 20, 0, 16, C.applianceDark);
  },
});

const flowerBed = (): Spec => ({
  w: 60,
  d: 18,
  draw: (pen) => {
    pen(-30, 30, 0, 18, 0, 8, C.soil);
    let i = 0;
    for (let u = -26; u <= 26; u += 8)
      for (const v of [5, 13])
        pen(
          u - 3,
          u + 3,
          v - 3,
          v + 3,
          8,
          14,
          C.flowers[i++ % C.flowers.length],
          { shape: "sphere" },
        );
  },
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const kitchen = (ctx: Ctx) => {
  place(ctx, fridge(), "fridge");
  // Counters along the two walls with the most free length (an L or a galley).
  const runsByWall = WALLS.map((wall) => {
    const f = frameOf(ctx.room, wall);
    const runs = freeRuns(ctx, f, 26, [...ctx.doorZones, ...ctx.placed]).filter(
      ([a, b]) => b - a >= 24,
    );
    return { f, total: runs.reduce((s, [a, b]) => s + b - a, 0) };
  })
    .filter((w) => w.total >= 30)
    .sort((a, b) => b.total - a.total)
    .slice(0, 2);
  let stove = false;
  let sink = false;
  piece(ctx, "counters", () => {
    for (const { f } of runsByWall) {
      // Recomputed so the second wall stops at the first wall's counters.
      const runs = freeRuns(ctx, f, 26, [
        ...ctx.doorZones,
        ...ctx.placed,
      ]).filter(([a, b]) => b - a >= 24);
      const uppers = freeRuns(ctx, f, 14, [
        ...ctx.doorZones,
        ...ctx.windowZones,
        ...ctx.placed,
      ]);
      for (const [a, b] of runs) {
        const pen = penFor(f, 0, INSET, ctx.parts);
        pen(a, b, 0, 24, 4, 34, C.cabinet);
        pen(a + 1, b - 1, 0, 21, 0, 4, C.counter);
        pen(a, b, 0, 25, 34, 35.5, C.counter);
        const mid = (a + b) / 2;
        if (!stove && b - a >= 30) {
          stove = true;
          pen(mid - 12, mid + 12, 2, 22, 35.5, 36, C.applianceDark);
          pen(mid - 14, mid + 14, 24, 24.4, 6, 30, C.applianceDark);
          for (const [du, dv] of [
            [-6, 7],
            [6, 7],
            [-6, 16],
            [6, 16],
          ])
            pen(mid + du - 3, mid + du + 3, dv - 3, dv + 3, 36, 36.3, C.metal, {
              shape: "cyl",
            });
        } else if (!sink && b - a >= 30) {
          sink = true;
          pen(mid - 12, mid + 12, 4, 20, 34.8, 35.7, C.basin);
          pen(mid - 1, mid + 1, 1.5, 4, 35.5, 46, C.metal, { shape: "cyl" });
        }
        ctx.placed.push(f.rect(a, b, INSET, INSET + 25));
      }
      for (const [a, b] of uppers.filter(([a, b]) => b - a >= 18)) {
        const pen = penFor(f, 0, INSET, ctx.parts);
        pen(a, b, 0, 13, 54, 84, C.cabinet);
        for (let u = a + 18; u < b - 4; u += 18)
          pen(u - 0.3, u + 0.3, 13, 13.3, 56, 82, C.appliance);
      }
    }
  });
  if (Math.min(ctx.room.width, ctx.room.length) >= 132)
    place(
      ctx,
      {
        w: 60,
        d: 30,
        anchor: "center",
        clearance: 34,
        draw: (pen) => {
          pen(-29, 29, 1, 29, 4, 34, C.cabinet);
          pen(-31, 31, -1, 31, 34, 35.5, C.counter);
          for (const u of [-18, 0, 18]) {
            pen(u - 7, u + 7, 32, 46, 24, 26, C.woodDark, { shape: "cyl" });
            pen(u - 1, u + 1, 38, 40, 0, 24, C.metal);
          }
        },
      },
      "island",
    );
};

const bedroom = (ctx: Ctx, i: number) => {
  placeAny(
    ctx,
    [
      bed(60, 80, true),
      bed(60, 80, false),
      bed(40, 76, true),
      bed(40, 76, false),
    ],
    "bed",
  );
  placeAny(ctx, [wardrobe(48), wardrobe(36)], "wardrobe");
  place(ctx, desk(), "desk");
  place(ctx, plant(), "plant");
  place(ctx, wallArt(C.art[i % C.art.length]), "wall_art");
};

const livingArea = (ctx: Ctx, i: number) => {
  placeAny(ctx, sofaSet(), "sofa");
  place(ctx, armchair(), "armchair");
  place(ctx, armchair(), "armchair");
  place(ctx, bookshelf(), "bookshelf");
  place(ctx, floorLamp(), "floor_lamp");
  place(ctx, plant(), "plant");
  place(ctx, wallArt(C.art[(i + 1) % C.art.length], 40), "wall_art");
};

const tvLounge = (ctx: Ctx) => {
  const tvWall = place(ctx, tvUnit(), "tv");
  const sofaWall = placeAny(
    ctx,
    sofaSet(tvWall ? [OPPOSITE[tvWall]] : undefined),
    "sofa",
  );
  if (!sofaWall) placeAny(ctx, sofaSet(), "sofa");
  place(ctx, armchair(), "armchair");
  place(ctx, plant(), "plant");
  place(ctx, floorLamp(), "floor_lamp");
};

const dining = (ctx: Ctx) => {
  const r = ctx.room;
  const walls: Wall[] =
    r.width >= r.length ? ["top", "bottom"] : ["left", "right"];
  placeAny(
    ctx,
    [
      diningTable(84, 40, 3, true, walls),
      diningTable(72, 36, 3, true, walls),
      diningTable(60, 36, 2, true, walls),
      diningTable(60, 30, 2, true, walls),
      diningTable(48, 30, 2, false, walls),
      diningTable(60, 30, 2, true, walls, true),
      diningTable(48, 30, 2, false, walls, true),
      diningTable(30, 30, 1, false, walls, true),
    ],
    "dining_table",
  );
  place(ctx, sideboard(), "sideboard");
  place(ctx, plant(), "plant");
};

const bathroom = (ctx: Ctx) => {
  placeAny(ctx, [bathtub(), shower()], "bath");
  place(ctx, toilet(), "toilet");
  placeAny(ctx, [vanity(30), vanity(24), vanity(20)], "vanity");
};

const garage = (ctx: Ctx) => {
  const r = ctx.room;
  const roll = r.doors?.find((d) => d.kind === "overhead");
  const specs: Spec[] = [];
  if (roll) {
    const f = frameOf(r, roll.wall);
    const len = Math.min(176, f.D - 24 - 20);
    const centre = roll.offset + roll.width / 2;
    if (len >= 140) specs.push(car(len, [roll.wall], [centre, f.L / 2], 24));
  }
  // Otherwise park it lengthways wherever it fits, as long as it can (down to a compact car).
  for (const len of [176, 160, 148, 138])
    for (const wall of WALLS) {
      const f = frameOf(r, wall);
      if (len + 2 * INSET + 4 > f.D) continue;
      const us = [f.L / 2, 36 + INSET + 2, f.L - 36 - INSET - 2];
      for (const v0 of [(f.D - len) / 2, INSET + 2, f.D - len - INSET - 2])
        specs.push(car(len, [wall], us, v0));
    }
  placeAny(ctx, specs, "car");
  place(ctx, shelving(), "shelving");
  place(ctx, workbench(), "workbench");
};

const hallway = (ctx: Ctx, i: number) => {
  const r = ctx.room;
  const wall: Wall = r.width >= r.length ? "top" : "left";
  const f = frameOf(r, wall);
  const pen = penFor(f, f.L / 2, 0, ctx.parts);
  const runner = Math.min(30, f.D - 16);
  if (runner >= 18)
    piece(ctx, "rug", () =>
      pen(
        -(f.L / 2 - 18),
        f.L / 2 - 18,
        (f.D - runner) / 2,
        (f.D + runner) / 2,
        0,
        0.4,
        C.runner,
        {
          walkThrough: true,
        },
      ),
    );
  if (f.D >= 44) place(ctx, consoleTable(), "console");
  place(ctx, wallArt(C.art[(i + 2) % C.art.length], 24), "wall_art");
};

const garden = (ctx: Ctx) => {
  for (let k = 0; k < 4; k++) place(ctx, tree(), "tree");
  place(ctx, bench(), "bench");
  place(ctx, flowerBed(), "flower_bed");
  place(ctx, flowerBed(), "flower_bed");
};

const custom = (ctx: Ctx) => {
  place(ctx, desk(), "desk");
  place(ctx, bookshelf(), "bookshelf");
  place(ctx, plant(), "plant");
};

const RECIPES: Partial<
  Record<Room["type"], (ctx: Ctx, index: number) => void>
> = {
  bedroom,
  kitchen,
  living_area: livingArea,
  tv_lounge: tvLounge,
  dining,
  bathroom,
  garage,
  hallway,
  garden,
  custom,
};

/** Keep-clear zones in front of (and behind) every door, from any room. */
const doorZones = (rooms: Room[]): Rect[] =>
  rooms.flatMap((room) =>
    (room.doors ?? []).map((door) => {
      const seg = itemSegment(room, door);
      const depth =
        door.kind === "overhead"
          ? FURNITURE.garageDoorClearance
          : door.width + FURNITURE.doorClearance;
      const [a, b] = [seg.from - 4, seg.to + 4];
      return seg.orient === "h"
        ? { x0: a, x1: b, y0: seg.line - depth, y1: seg.line + depth }
        : { x0: seg.line - depth, x1: seg.line + depth, y0: a, y1: b };
    }),
  );

const windowZones = (rooms: Room[]): Rect[] =>
  rooms.flatMap((room) =>
    (room.windows ?? []).map((win) => {
      const seg = itemSegment(room, win);
      const k = FURNITURE.windowClearance;
      return seg.orient === "h"
        ? {
            x0: seg.from - 2,
            x1: seg.to + 2,
            y0: seg.line - k,
            y1: seg.line + k,
          }
        : {
            x0: seg.line - k,
            x1: seg.line + k,
            y0: seg.from - 2,
            y1: seg.to + 2,
          };
    }),
  );

/** Floor taken by stairs inside a room, plus the landing in front of the bottom step. */
const stairsZone = (room: Room): Rect[] => {
  if (!room.stairs) return [];
  const r = inRoomStairsRect(room, room.stairs);
  const rect: Rect = {
    x0: room.x_position + r.x,
    x1: room.x_position + r.x + r.width,
    y0: room.y_position + r.y,
    y1: room.y_position + r.y + r.length,
  };
  const landing = IN_ROOM_STAIRS.landing;
  const foot = inRoomStairsFoot(room.stairs);
  if (foot === "left") rect.x0 -= landing;
  else if (foot === "right") rect.x1 += landing;
  else if (foot === "top") rect.y0 -= landing;
  else rect.y1 += landing;
  return [rect];
};

interface BuildOptions {
  /** Include pieces the user removed (to list everything a room could have). */
  includeRemoved?: boolean;
}

const run = (rooms: Room[], { includeRemoved = false }: BuildOptions = {}) => {
  const doors = doorZones(rooms);
  const windows = windowZones(rooms);
  const parts: Part[] = [];
  const placements: Ctx["placements"] = [];
  const counts: Partial<Record<Room["type"], number>> = {};
  for (const room of rooms) {
    const recipe = RECIPES[room.type];
    if (!recipe) continue;
    const index = counts[room.type] ?? 0;
    counts[room.type] = index + 1;
    // The whole room's furniture switched off.
    if (room.furniture === false && !includeRemoved) continue;
    recipe(
      {
        room,
        hidden: new Set(room.hiddenFurniture ?? []),
        keepHidden: includeRemoved,
        placements,
        doorZones: doors,
        windowZones: windows,
        placed: stairsZone(room),
        parts,
      },
      index,
    );
  }
  return { parts, placements };
};

/** All furniture for the plan, minus anything the user removed. */
export const buildFurniture = (rooms: Room[]): Part[] => run(rooms).parts;

/** The pieces a room gets (removed or not), with how many of each. */
export const furnitureOptions = (
  rooms: Room[],
  roomId: string,
): { key: FurnitureKey; count: number }[] => {
  const counts = new Map<FurnitureKey, number>();
  for (const p of run(rooms, { includeRemoved: true }).placements)
    if (p.roomId === roomId) counts.set(p.key, (counts.get(p.key) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count }));
};
