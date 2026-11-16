export const ROOM_TYPES = [
  "bedroom",
  "kitchen",
  "living_area",
  "tv_lounge",
  "bathroom",
  "dining",
  "hallway",
  "vent_shaft",
  "stairs",
  "garage",
  "garden",
  "open_space",
  "custom",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const DOOR_KINDS = ["swing", "opening", "overhead"] as const;
export type DoorKind = (typeof DOOR_KINDS)[number];

export const WALLS = ["top", "right", "bottom", "left"] as const;

/** Floor surfaces for the 3D view. */
export const FLOOR_FINISHES = [
  "wood",
  "tile",
  "marble",
  "carpet",
  "concrete",
  "grass",
] as const;
export type FloorFinish = (typeof FLOOR_FINISHES)[number];
export type Wall = (typeof WALLS)[number];

/**
 * Something set into one of a room's walls (a door or a window). Measurements are
 * inches; `offset` runs from the wall's start (left end for top/bottom walls, top end
 * for left/right walls).
 */
export interface WallItem {
  id: string;
  wall: Wall;
  offset: number;
  width: number;
}

/** A door; it swings into the room that owns it. */
export interface Door extends WallItem {
  /** Mirror the hinge to the other jamb. */
  flip?: boolean;
  /** "swing" (default) hinged door, "opening" a doorless gap, "overhead" a roll-up garage door. */
  kind?: DoorKind;
}

/** All dimensions and positions are whole inches. */
export interface Room {
  id: string;
  type: RoomType;
  /** Only used when type === "custom". */
  customName?: string;
  width: number;
  length: number;
  x_position: number;
  y_position: number;
  doors?: Door[];
  windows?: RoomWindow[];
  vents?: RoomVent[];
  /** Paint on the room's inside walls (hex). Unset: the default for its type. */
  wallColor?: string;
  /** Floor surface. Unset: the default for its type. */
  floorFinish?: FloorFinish;
  /** Whether the room has walls of its own. Unset: the default for its type. */
  walls?: boolean;
  /** A flight of stairs built inside the room (e.g. in a garage or lounge). */
  stairs?: InRoomStairs;
  /** Set to false to take all furniture out of the room (3D). */
  furniture?: boolean;
  /** Individual pieces taken out of the room (see FURNITURE_KEYS). */
  hiddenFurniture?: string[];
}

/**
 * A straight flight of stairs inside a room, backing onto one of its walls. Like a
 * wall item, `offset` is where it starts along that wall; `run` is how long it is
 * along the wall and `width` how far it comes out into the room. It climbs from the
 * wall's start towards its end, or the other way when `reverse` is set.
 */
export interface InRoomStairs {
  wall: Wall;
  offset: number;
  run: number;
  width: number;
  reverse?: boolean;
}

export type RoomWindow = WallItem;
/** A louvred ventilation opening in a wall (exhaust / air vent). */
export type RoomVent = WallItem;

export type NewRoomInput = Pick<
  Room,
  "type" | "customName" | "width" | "length"
>;

/** Plot (canvas) size in inches. */
export interface PlotSize {
  width: number;
  length: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  length: number;
}
