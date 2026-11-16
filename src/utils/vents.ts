import { VENT, VENT_RULES } from "@/constants/floorPlan";
import type { RoomVent, Wall, WallItem } from "@/types/room";
import { wallLength, type RoomLike } from "./doors";
import { createId } from "./id";
import { outsideSpans } from "./windows";

type WithOpenings = RoomLike & { doors?: WallItem[]; windows?: WallItem[] };

/**
 * An exhaust vent for rooms that need one (bathroom, kitchen, garage), on the longest
 * stretch of outside wall not already taken by a door or window.
 */
export const ventsFor = (
  room: WithOpenings,
  others: RoomLike[],
): RoomVent[] => {
  const preferred = VENT_RULES[room.type];
  if (!preferred) return [];
  const blockers = [...(room.doors ?? []), ...(room.windows ?? [])];
  const [span] = outsideSpans(
    room,
    others,
    blockers,
    VENT.clearance,
    VENT.min,
  ).sort((a, b) => b.end - b.start - (a.end - a.start));
  if (!span) return [];
  const width = Math.min(preferred, span.end - span.start);
  return [
    {
      id: createId(),
      wall: span.wall,
      width,
      offset: Math.round(span.start + (span.end - span.start - width) / 2),
    },
  ];
};

export const autoPlaceVents = (rooms: WithOpenings[]): RoomVent[][] =>
  rooms.map((room, i) =>
    ventsFor(
      room,
      rooms.filter((_, j) => j !== i),
    ),
  );

/** A vent centred on a wall (for the canvas "+" menu); defaults to the longest wall. */
export const ventOnWall = (room: RoomLike, wall?: Wall): RoomVent => {
  const target: Wall = wall ?? (room.width >= room.length ? "top" : "left");
  const len = wallLength(room, target);
  const width = Math.min(VENT_RULES[room.type] ?? VENT.default, len);
  return {
    id: createId(),
    wall: target,
    width,
    offset: Math.round((len - width) / 2),
  };
};
