import {
  DOOR,
  MAX_PLOT_IN,
  MAX_ROOM_IN,
  MIN_PLOT_IN,
  MIN_ROOM_IN,
  VENT,
  WINDOW,
} from "@/constants/floorPlan";
import {
  DOOR_KINDS,
  FLOOR_FINISHES,
  ROOM_TYPES,
  WALLS,
  type Door,
  type PlotSize,
  type Room,
  type WallItem,
} from "@/types/room";
import { normalizeWallItem } from "./doors";
import { createId } from "./id";
import { normalizeInRoomStairs } from "./inRoomStairs";

/** Everything that makes up a plan (what gets saved, autosaved and exported). */
export interface PlanData {
  plot: PlotSize;
  rooms: Room[];
  exteriorColor?: string;
}

/** A downloaded plan file. */
export interface PlanFile {
  kind: typeof PLAN_FILE_KIND;
  version: number;
  name: string;
  savedAt: string;
  plan: PlanData;
}

export const PLAN_FILE_KIND = "floor-plan-studio";
export const PLAN_FILE_VERSION = 1;
export const PLAN_FILE_EXTENSION = ".floorplan.json";
export const MAX_PLAN_NAME = 60;

export type PlanParseError =
  "not_json" | "not_plan" | "newer_version" | "invalid";

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isHex = (v: unknown): v is string =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

const cleanItems = <T extends WallItem>(
  room: Pick<Room, "width" | "length">,
  raw: unknown,
  minWidth: number,
  extra: (item: Record<string, unknown>) => Partial<T> = () => ({}),
): T[] =>
  (Array.isArray(raw) ? raw : [])
    .filter(
      (i): i is Record<string, unknown> =>
        isObject(i) &&
        oneOf(WALLS, i.wall) &&
        isNumber(i.offset) &&
        isNumber(i.width),
    )
    .map((i) =>
      normalizeWallItem(
        room,
        {
          id: createId(),
          wall: i.wall as WallItem["wall"],
          offset: i.offset as number,
          width: i.width as number,
          ...extra(i),
        } as T,
        minWidth,
      ),
    );

/**
 * Check and tidy plan data from outside the app (a file, or browser storage).
 * Returns null if it isn't a usable plan. Optional extras that are malformed are
 * dropped rather than rejecting the whole plan; ids are always regenerated.
 */
export const sanitizePlan = (raw: unknown): PlanData | null => {
  if (!isObject(raw) || !isObject(raw.plot) || !Array.isArray(raw.rooms))
    return null;
  const { width: pw, length: pl } = raw.plot;
  if (!isNumber(pw) || !isNumber(pl)) return null;
  const plot = {
    width: Math.round(Math.min(Math.max(pw, MIN_PLOT_IN), MAX_PLOT_IN)),
    length: Math.round(Math.min(Math.max(pl, MIN_PLOT_IN), MAX_PLOT_IN)),
  };

  const rooms: Room[] = [];
  for (const r of raw.rooms) {
    if (
      !isObject(r) ||
      !oneOf(ROOM_TYPES, r.type) ||
      ![r.width, r.length, r.x_position, r.y_position].every(isNumber)
    )
      return null;
    const room: Room = {
      id: createId(),
      type: r.type,
      width: Math.round(
        Math.min(Math.max(r.width as number, MIN_ROOM_IN), MAX_ROOM_IN),
      ),
      length: Math.round(
        Math.min(Math.max(r.length as number, MIN_ROOM_IN), MAX_ROOM_IN),
      ),
      x_position: Math.round(r.x_position as number),
      y_position: Math.round(r.y_position as number),
    };
    if (
      room.x_position < 0 ||
      room.y_position < 0 ||
      room.x_position + room.width > plot.width ||
      room.y_position + room.length > plot.length
    )
      return null;
    if (room.type === "custom")
      room.customName =
        typeof r.customName === "string" && r.customName.trim()
          ? r.customName.trim().slice(0, 24)
          : undefined;
    room.doors = cleanItems<Door>(room, r.doors, DOOR.min, (i) => ({
      ...(oneOf(DOOR_KINDS, i.kind) ? { kind: i.kind } : {}),
      ...(i.flip === true ? { flip: true } : {}),
    }));
    room.windows = cleanItems(room, r.windows, WINDOW.min);
    room.vents = cleanItems(room, r.vents, VENT.min);
    if (isHex(r.wallColor)) room.wallColor = r.wallColor;
    if (oneOf(FLOOR_FINISHES, r.floorFinish)) room.floorFinish = r.floorFinish;
    if (typeof r.walls === "boolean") room.walls = r.walls;
    if (r.furniture === false) room.furniture = false;
    if (Array.isArray(r.hiddenFurniture)) {
      const hidden = r.hiddenFurniture
        .filter((k): k is string => typeof k === "string" && k.length <= 40)
        .slice(0, 50);
      if (hidden.length) room.hiddenFurniture = hidden;
    }
    const st = r.stairs;
    if (
      isObject(st) &&
      oneOf(WALLS, st.wall) &&
      [st.offset, st.run, st.width].every(isNumber)
    ) {
      const stairs = normalizeInRoomStairs(room, {
        wall: st.wall,
        offset: st.offset as number,
        run: st.run as number,
        width: st.width as number,
        reverse: st.reverse === true,
      });
      if (stairs) room.stairs = stairs;
    }
    rooms.push(room);
  }

  return {
    plot,
    rooms,
    ...(isHex(raw.exteriorColor) ? { exteriorColor: raw.exteriorColor } : {}),
  };
};

/** The JSON text of a downloadable plan file. */
export const toPlanFile = (name: string, plan: PlanData): string =>
  JSON.stringify(
    {
      kind: PLAN_FILE_KIND,
      version: PLAN_FILE_VERSION,
      name,
      savedAt: new Date().toISOString(),
      plan,
    } satisfies PlanFile,
    null,
    2,
  );

/** Read a plan file's text. */
export const parsePlanFile = (
  text: string,
):
  | { ok: true; name: string; plan: PlanData }
  | { ok: false; error: PlanParseError } => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "not_json" };
  }
  if (!isObject(data) || data.kind !== PLAN_FILE_KIND)
    return { ok: false, error: "not_plan" };
  if (!isNumber(data.version) || data.version > PLAN_FILE_VERSION)
    return { ok: false, error: "newer_version" };
  const plan = sanitizePlan(data.plan);
  if (!plan) return { ok: false, error: "invalid" };
  const name =
    typeof data.name === "string" && data.name.trim()
      ? data.name.trim().slice(0, MAX_PLAN_NAME)
      : "";
  return { ok: true, name, plan };
};

/** A safe file name for a plan. */
export const planFileName = (name: string, fallback: string) => {
  const slug = (name || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, MAX_PLAN_NAME);
  return `${slug || "floor-plan"}${PLAN_FILE_EXTENSION}`;
};

/** JSON with object keys sorted (and ids / empty lists left out), so equal plans give equal text. */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    isObject(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .filter(
              (k) =>
                k !== "id" &&
                v[k] !== undefined &&
                // A missing list and an empty one mean the same thing.
                !(Array.isArray(v[k]) && (v[k] as unknown[]).length === 0),
            )
            .map((k) => [k, v[k]]),
        )
      : v,
  );

/** Plan data compared ignoring ids and key order (to tell whether there are unsaved changes). */
export const planFingerprint = (plan: PlanData) =>
  stableStringify({
    plot: plan.plot,
    exteriorColor: plan.exteriorColor ?? null,
    rooms: plan.rooms,
  });
