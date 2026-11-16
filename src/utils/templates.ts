import { INCHES_PER_FOOT, MIN_ROOM_IN } from "@/constants/floorPlan";
import type { HouseTemplate } from "@/constants/houseTemplates";
import type { PlotSize, Room } from "@/types/room";

export type PlacedRoom = Omit<Room, "id">;

/** Templates are landscape; portrait plots get the layout transposed. */
export const isPortrait = (plot: PlotSize) => plot.length > plot.width;

/** Minimum plot (inches) in the orientation the template will be used for this plot. */
export const templateMinPlot = (
  template: HouseTemplate,
  plot: PlotSize,
): PlotSize => {
  const w = template.minPlotFt.width * INCHES_PER_FOOT;
  const l = template.minPlotFt.length * INCHES_PER_FOOT;
  return isPortrait(plot) ? { width: l, length: w } : { width: w, length: l };
};

export const templateFits = (template: HouseTemplate, plot: PlotSize) => {
  const min = templateMinPlot(template, plot);
  return plot.width >= min.width && plot.length >= min.length;
};

/**
 * Scale a template's percentage layout to the plot. Edges are rounded to whole inches
 * first and sizes derived from them, so neighbouring rooms stay exactly flush.
 */
export const buildTemplateRooms = (
  template: HouseTemplate,
  plot: PlotSize,
): PlacedRoom[] => {
  const portrait = isPortrait(plot);
  const edge = (pct: number, total: number) => Math.round((pct / 100) * total);

  return template.rooms
    .map((r) => {
      const [x, y, w, l] = portrait
        ? [r.y, r.x, r.l, r.w]
        : [r.x, r.y, r.w, r.l];
      const left = edge(x, plot.width);
      const top = edge(y, plot.length);
      return {
        type: r.type,
        x_position: left,
        y_position: top,
        width: edge(x + w, plot.width) - left,
        length: edge(y + l, plot.length) - top,
      };
    })
    .filter((r) => r.width >= MIN_ROOM_IN && r.length >= MIN_ROOM_IN);
};
