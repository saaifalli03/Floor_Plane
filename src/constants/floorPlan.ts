import type { PlotSize, RoomType } from "@/types/room";

export const INCHES_PER_FOOT = 12;
const ft = (feet: number, inches = 0) => feet * INCHES_PER_FOOT + inches;

/** Grid snap step while dragging / placing (inches). */
export const SNAP_INCHES = 6;
/** Room edges within this many screen pixels of another wall snap flush to it. */
export const EDGE_SNAP_PX = 10;

export const DEFAULT_PLOT: PlotSize = { width: ft(60), length: ft(40) };
export const MIN_PLOT_IN = ft(10);
export const MAX_PLOT_IN = ft(500);

export const MIN_ROOM_IN = ft(2);
export const MAX_ROOM_IN = ft(200);

/** The canvas is scaled so the plot fits roughly within this box (px). */
export const CANVAS_TARGET_PX = { width: 1200, height: 800 };
export const MIN_PX_PER_FOOT = 3;
export const MAX_PX_PER_FOOT = 40;

export const DEFAULT_ROOM_SIZE: Record<RoomType, { width: number; length: number }> = {
  bedroom: { width: ft(12), length: ft(12) },
  kitchen: { width: ft(10), length: ft(12) },
  living_area: { width: ft(18), length: ft(16) },
  tv_lounge: { width: ft(15), length: ft(12) },
  bathroom: { width: ft(8), length: ft(6) },
  stairs: { width: ft(4), length: ft(12) },
  garage: { width: ft(20), length: ft(20) },
  garden: { width: ft(25), length: ft(15) },
  dining: { width: ft(12), length: ft(10) },
  hallway: { width: ft(4), length: ft(15) },
  vent_shaft: { width: ft(3), length: ft(3) },
  custom: { width: ft(10), length: ft(10) },
};

/** Fill / border colours per room type (hex so html2canvas renders them reliably). */
export const ROOM_COLORS: Record<RoomType, { fill: string; border: string; text: string }> = {
  bedroom: { fill: "#e0e7ff", border: "#6366f1", text: "#312e81" },
  kitchen: { fill: "#fef3c7", border: "#d97706", text: "#78350f" },
  living_area: { fill: "#dcfce7", border: "#16a34a", text: "#14532d" },
  tv_lounge: { fill: "#fce7f3", border: "#db2777", text: "#831843" },
  bathroom: { fill: "#cffafe", border: "#0891b2", text: "#164e63" },
  stairs: { fill: "#e5e7eb", border: "#4b5563", text: "#1f2937" },
  garage: { fill: "#f1f5f9", border: "#64748b", text: "#1e293b" },
  garden: { fill: "#d9f99d", border: "#65a30d", text: "#365314" },
  dining: { fill: "#fde68a", border: "#ca8a04", text: "#713f12" },
  hallway: { fill: "#f5f5f4", border: "#a8a29e", text: "#44403c" },
  vent_shaft: { fill: "#e0f2fe", border: "#0369a1", text: "#0c4a6e" },
  custom: { fill: "#ffedd5", border: "#ea580c", text: "#7c2d12" },
};

/** Door widths and clearances (inches). */
export const DOOR = {
  default: 36,
  min: 24,
  bathroom: 30,
  entrance: 42,
  garage: 108,
  /** Minimum solid wall left on each side of a door. */
  jamb: 6,
} as const;

/** Window sizing (inches). */
export const WINDOW = {
  default: 36,
  min: 18,
  /** Solid wall kept between a window and a corner, door or neighbouring room. */
  clearance: 12,
} as const;

/** Preferred window width and how many windows a room type gets (0 = none). */
export const WINDOW_RULES: Record<RoomType, { width: number; max: number }> = {
  bedroom: { width: 48, max: 2 },
  kitchen: { width: 48, max: 1 },
  living_area: { width: 72, max: 2 },
  tv_lounge: { width: 60, max: 2 },
  dining: { width: 60, max: 1 },
  bathroom: { width: 24, max: 1 },
  hallway: { width: 36, max: 1 },
  garage: { width: 36, max: 1 },
  custom: { width: 36, max: 1 },
  stairs: { width: 0, max: 0 },
  garden: { width: 0, max: 0 },
  vent_shaft: { width: 0, max: 0 },
};

/** Wall vent sizing (inches). */
export const VENT = { default: 12, min: 6, clearance: 6 } as const;

/** Room types that get an exhaust vent automatically, and its width (inches). */
export const VENT_RULES: Partial<Record<RoomType, number>> = {
  bathroom: 12,
  kitchen: 18,
  garage: 12,
};

/** Room types that never get doors, windows or vents of their own. */
export const NO_OPENING_TYPES: RoomType[] = ["vent_shaft"];

export const VENT_COLORS = { frame: "#0369a1", slat: "#0369a1", fill: "#f0f9ff" };

export const WINDOW_COLORS = { frame: "#334155", glass: "#0284c7", fill: "#ffffff" };

/** Typical stair tread depth, used to space tread lines on the plan (inches). */
export const STAIR_TREAD_IN = 10;

export const DOOR_COLORS = {
  leaf: "#334155",
  swing: "#64748b",
  opening: "#ffffff",
  active: "#4f46e5",
};

/** Outline for the room a dragged room would swap with. */
export const SWAP_COLOR = "#4f46e5";

export const CANVAS_ELEMENT_ID = "floor-plan-canvas";
