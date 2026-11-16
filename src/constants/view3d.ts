import type { FloorFinish, Room, RoomType } from "@/types/room";

/** Heights and thicknesses for the 3D view (inches). */
export const WALL_HEIGHT_IN = 108;
/** Wall height in cut-away mode, low enough to see into rooms. */
export const CUTAWAY_HEIGHT_IN = 42;
export const WALL_THICKNESS_IN = 5;
export const DOOR_HEIGHT_IN = 80;
export const GARAGE_DOOR_HEIGHT_IN = 90;
export const WINDOW_SILL_IN = 36;
export const WINDOW_HEAD_IN = 84;
export const VENT_BOTTOM_IN = 88;
export const VENT_TOP_IN = 100;
export const DOOR_LEAF_THICKNESS_IN = 1.75;
export const FLOOR_THICKNESS_IN = 2;

export const COLORS_3D = {
  wall: "#f8fafc",
  ground: "#e2e8f0",
  plot: "#f1f5f9",
  doorLeaf: "#b45309",
  glass: "#7dd3fc",
  vent: "#475569",
  shaftFloor: "#1e293b",
  stairs: "#cbd5e1",
  selected: "#6366f1",
  railing: "#334155",
  storageDoor: "#d9b98f",
  handle: "#a1a1aa",
};

/** First-person walk-through and guided tour (inches, seconds, radians). */
export const WALK = {
  /** Camera height above the floor you're standing on. */
  eyeHeight: 64,
  /** Body radius used for wall collisions. */
  radius: 7,
  /** Body height: wall pieces starting above this (door headers) don't block. */
  height: 70,
  /** Highest step you can walk up without jumping. */
  stepUp: 14,
  /** Walking speed per second; running multiplies it. */
  speed: 54,
  runMultiplier: 2,
  /** How far beyond the plot you can wander outside. */
  outsideMargin: 240,
  /** Where you start: this far outside the front door. */
  spawnDistance: 84,
  /** Mouse / touch look sensitivity (radians per pixel). */
  lookSensitivity: 0.0025,
  /** How far up / down you can look. */
  maxPitch: 1.35,
  /** How quickly the eye height follows the floor (stairs feel smooth). */
  heightFollow: 10,
  fov: 70,
} as const;

export const TOUR = {
  /** Walking pace of the guided tour, per second. */
  speed: 40,
  /** Turning speed, radians per second. */
  turnRate: 2.2,
  /** Pause in each room, seconds. */
  dwell: 1.4,
  /** Distance inside a room from a doorway the path passes through. */
  doorClearance: 20,
  /** Stop this far short of the end wall at the top of a flight of stairs. */
  stairsTopClearance: 15,
} as const;

/** Furniture and fittings in the 3D view. */
export const FURNITURE_COLORS = {
  wood: "#b07a45",
  woodDark: "#6b4226",
  woodLight: "#d9b98f",
  fabric: "#64748b",
  cushion: "#94a3b8",
  armchair: "#0f766e",
  bedFrame: "#8b5e34",
  sheet: "#f8fafc",
  duvet: "#93c5fd",
  pillow: "#ffffff",
  cabinet: "#e7e5e4",
  counter: "#44403c",
  marble: "#f5f5f4",
  appliance: "#d4d4d8",
  applianceDark: "#27272a",
  screen: "#0b1120",
  porcelain: "#fafafa",
  glass: "#bae6fd",
  water: "#7dd3fc",
  metal: "#a1a1aa",
  basin: "#cbd5e1",
  rug: "#e7cfc0",
  runner: "#c4b5fd",
  car: "#2563eb",
  carGlass: "#1e293b",
  tire: "#18181b",
  headlight: "#fef9c3",
  taillight: "#ef4444",
  box: "#c8a26a",
  pegboard: "#d6d3d1",
  leaf: "#4d7c0f",
  leafLight: "#65a30d",
  trunk: "#78350f",
  soil: "#713f12",
  pot: "#c2410c",
  lampShade: "#fef3c7",
  flowers: ["#f43f5e", "#facc15", "#a855f7", "#fb923c"],
  art: ["#f59e0b", "#0ea5e9", "#10b981", "#e11d48"],
  books: ["#b91c1c", "#1d4ed8", "#15803d", "#a16207", "#7e22ce", "#334155"],
} as const;

/** Furniture layout rules (inches). */
export const FURNITURE = {
  /** Gap kept from the wall line (half the wall's thickness plus a little). */
  inset: 3,
  /** Kept clear in front of a door, beyond its own width. */
  doorClearance: 10,
  /** Kept clear in front of a roll-up garage door. */
  garageDoorClearance: 18,
  /** Tall pieces stay this far from windows. */
  windowClearance: 14,
} as const;

/** Default paint for each room type's inside walls. */
export const DEFAULT_WALL_PAINT: Record<RoomType, string> = {
  bedroom: "#e0e7ff",
  kitchen: "#fef3c7",
  living_area: "#f5efe6",
  tv_lounge: "#d1e7d6",
  bathroom: "#dbeafe",
  dining: "#fde7d9",
  hallway: "#f5f5f4",
  vent_shaft: "#475569",
  stairs: "#f1f5f9",
  garage: "#d6d3d1",
  garden: "#f8fafc",
  open_space: "#f8fafc",
  custom: "#f8fafc",
};

export const DEFAULT_FLOOR: Record<RoomType, FloorFinish> = {
  bedroom: "wood",
  kitchen: "tile",
  living_area: "wood",
  tv_lounge: "carpet",
  bathroom: "tile",
  dining: "wood",
  hallway: "marble",
  vent_shaft: "concrete",
  stairs: "wood",
  garage: "concrete",
  garden: "grass",
  open_space: "tile",
  custom: "wood",
};

/** Ready-made paint colours offered in the editor. */
export const PAINT_SWATCHES = [
  "#f8fafc",
  "#faf5eb",
  "#f5efe6",
  "#e7e1d7",
  "#d1e7d6",
  "#ccfbf1",
  "#dbeafe",
  "#e0e7ff",
  "#fde2e4",
  "#fde7d9",
  "#fef3c7",
  "#94a3b8",
  "#475569",
  "#1e3a5f",
] as const;

/** Default paint on the outside of the house. */
export const DEFAULT_EXTERIOR_PAINT = "#e8dcc8";

/** Suggested outside colours: stucco, cream, white, sage, grey, brick, slate. */
export const EXTERIOR_PRESETS = [
  "#e8dcc8",
  "#f5f0e6",
  "#fafafa",
  "#b8c4a8",
  "#9ca3af",
  "#b45f45",
  "#475569",
] as const;

export const wallPaintOf = (room: Pick<Room, "type" | "wallColor">) =>
  room.wallColor ?? DEFAULT_WALL_PAINT[room.type];
export const floorFinishOf = (room: Pick<Room, "type" | "floorFinish">) =>
  room.floorFinish ?? DEFAULT_FLOOR[room.type];
