"use client";

import { ROOM_COLORS } from "@/constants/floorPlan";
import type { PlotSize } from "@/types/room";
import type { PlacedRoom } from "@/utils/templates";

export interface TemplatePreviewProps {
  rooms: PlacedRoom[];
  plot: PlotSize;
  /** Preview box size in px; the plot is fitted inside, keeping its aspect ratio. */
  maxWidth?: number;
  maxHeight?: number;
}

/** Miniature, non-interactive rendering of a layout at the plot's real proportions. */
export default function TemplatePreview({
  rooms,
  plot,
  maxWidth = 240,
  maxHeight = 150,
}: TemplatePreviewProps) {
  const scale = Math.min(maxWidth / plot.width, maxHeight / plot.length);
  return (
    <div
      className="flex items-center justify-center rounded-md bg-slate-50"
      style={{ height: maxHeight + 8 }}
    >
      <div
        className="relative border border-slate-400 bg-white"
        style={{ width: plot.width * scale, height: plot.length * scale }}
      >
        {rooms.map((room, i) => {
          const colors = ROOM_COLORS[room.type];
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: room.x_position * scale,
                top: room.y_position * scale,
                width: room.width * scale,
                height: room.length * scale,
                background: colors.fill,
                border: `1px solid ${colors.border}`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
