import type { RoomType } from "@/types/room";

/**
 * A room in a template, on a 0–100 grid in each direction (percent of the plot).
 * Rooms that share an edge use the same number, so they stay flush after scaling.
 */
export interface TemplateRoom {
  type: RoomType;
  x: number;
  y: number;
  w: number;
  l: number;
}

export interface HouseTemplate {
  /** Also the i18n key under templates.items. */
  id: "compact_2bed" | "family_3bed" | "garden_home" | "villa_4bed";
  /** Smallest plot (feet) the layout still works on, in its landscape orientation. */
  minPlotFt: { width: number; length: number };
  rooms: TemplateRoom[];
}

/** Templates are drawn landscape (wider than long); they are rotated for portrait plots. */
export const HOUSE_TEMPLATES: HouseTemplate[] = [
  {
    id: "compact_2bed",
    minPlotFt: { width: 28, length: 24 },
    rooms: [
      { type: "living_area", x: 0, y: 0, w: 55, l: 55 },
      { type: "kitchen", x: 55, y: 0, w: 45, l: 35 },
      { type: "bathroom", x: 55, y: 35, w: 20, l: 20 },
      { type: "hallway", x: 75, y: 35, w: 25, l: 20 },
      { type: "bedroom", x: 0, y: 55, w: 50, l: 45 },
      { type: "bedroom", x: 50, y: 55, w: 50, l: 45 },
    ],
  },
  {
    id: "family_3bed",
    minPlotFt: { width: 40, length: 32 },
    rooms: [
      { type: "garage", x: 0, y: 0, w: 25, l: 50 },
      { type: "living_area", x: 25, y: 0, w: 40, l: 50 },
      { type: "kitchen", x: 65, y: 0, w: 35, l: 30 },
      { type: "dining", x: 65, y: 30, w: 35, l: 20 },
      { type: "bedroom", x: 0, y: 50, w: 30, l: 50 },
      { type: "hallway", x: 30, y: 50, w: 10, l: 50 },
      { type: "bedroom", x: 40, y: 50, w: 25, l: 50 },
      { type: "bathroom", x: 65, y: 50, w: 35, l: 18 },
      { type: "bedroom", x: 65, y: 68, w: 35, l: 32 },
    ],
  },
  {
    id: "garden_home",
    minPlotFt: { width: 40, length: 32 },
    rooms: [
      { type: "garden", x: 0, y: 0, w: 100, l: 30 },
      { type: "living_area", x: 0, y: 30, w: 45, l: 40 },
      { type: "kitchen", x: 45, y: 30, w: 25, l: 40 },
      { type: "tv_lounge", x: 70, y: 30, w: 30, l: 40 },
      { type: "bedroom", x: 0, y: 70, w: 35, l: 30 },
      { type: "bathroom", x: 35, y: 70, w: 15, l: 30 },
      { type: "bedroom", x: 50, y: 70, w: 30, l: 30 },
      { type: "stairs", x: 80, y: 70, w: 20, l: 30 },
    ],
  },
  {
    id: "villa_4bed",
    minPlotFt: { width: 60, length: 40 },
    rooms: [
      { type: "garage", x: 0, y: 0, w: 20, l: 40 },
      { type: "living_area", x: 20, y: 0, w: 35, l: 40 },
      { type: "tv_lounge", x: 55, y: 0, w: 25, l: 40 },
      { type: "kitchen", x: 80, y: 0, w: 20, l: 25 },
      { type: "dining", x: 80, y: 25, w: 20, l: 15 },
      { type: "hallway", x: 0, y: 40, w: 100, l: 10 },
      { type: "bedroom", x: 0, y: 50, w: 25, l: 50 },
      { type: "stairs", x: 25, y: 50, w: 10, l: 25 },
      { type: "bathroom", x: 25, y: 75, w: 10, l: 25 },
      { type: "bedroom", x: 35, y: 50, w: 22, l: 50 },
      { type: "bedroom", x: 57, y: 50, w: 22, l: 50 },
      { type: "bathroom", x: 79, y: 50, w: 21, l: 20 },
      { type: "bedroom", x: 79, y: 70, w: 21, l: 30 },
    ],
  },
];
