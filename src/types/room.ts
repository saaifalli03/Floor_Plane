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
  "custom",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const DOOR_KINDS = ["swing", "opening", "overhead"] as const;
export type DoorKind = (typeof DOOR_KINDS)[number];

export const WALLS = ["top", "right", "bottom", "left"] as const;
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
}

export type RoomWindow = WallItem;
/** A louvred ventilation opening in a wall (exhaust / air vent). */
export type RoomVent = WallItem;

export type NewRoomInput = Pick<Room, "type" | "customName" | "width" | "length">;

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
