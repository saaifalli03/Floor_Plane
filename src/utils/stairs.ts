import { STAIR_MIN_RUN_IN } from "@/constants/floorPlan";
import type { Wall } from "@/types/room";

export interface StairsLayout {
  /** The flight runs up / down the plan (true) or across it (false). */
  vertical: boolean;
  /** The end you step on at; always one of the run's two end walls. */
  foot: Wall;
}

/**
 * Which way a straight flight runs, shared by the 2D symbol and the 3D model.
 * It climbs away from its opening (`entry`, the wall of the stairs' first door) when
 * that still leaves a proper run; otherwise it runs along the longer side, from the
 * bottom (or left) end.
 */
export const stairsLayout = (
  width: number,
  length: number,
  entry?: Wall,
): StairsLayout => {
  if (entry) {
    const vertical = entry === "top" || entry === "bottom";
    const run = vertical ? length : width;
    if (run >= STAIR_MIN_RUN_IN || run >= Math.max(width, length))
      return { vertical, foot: entry };
  }
  const vertical = length >= width;
  return { vertical, foot: vertical ? "bottom" : "left" };
};
