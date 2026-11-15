"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { MAX_PLOT_IN, MIN_PLOT_IN, SWAP_COLOR } from "@/constants/floorPlan";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import { useRoomStore } from "@/store/useRoomStore";
import type { PlotSize } from "@/types/room";
import { clamp, snap } from "@/utils/geometry";

type Axis = { w?: boolean; l?: boolean };

const HANDLES: {
  key: string;
  axis: Axis;
  cursor: string;
  style: CSSProperties;
}[] = [
  {
    key: "e",
    axis: { w: true },
    cursor: "ew-resize",
    style: { top: 0, bottom: 0, right: -9, width: 10 },
  },
  {
    key: "s",
    axis: { l: true },
    cursor: "ns-resize",
    style: { left: 0, right: 0, bottom: -9, height: 10 },
  },
  {
    key: "se",
    axis: { w: true, l: true },
    cursor: "nwse-resize",
    style: { right: -12, bottom: -12, width: 16, height: 16 },
  },
];

export interface CanvasResizeHandlesProps {
  pxPerInch: number;
  /** Freeze the canvas scale while dragging (null to release), so the plot grows under the cursor. */
  onScaleLock: (pxPerInch: number | null) => void;
}

/**
 * Handles on the canvas's right edge, bottom edge and corner that resize the plot.
 * The plot never shrinks past the rooms on it.
 */
export default function CanvasResizeHandles({
  pxPerInch,
  onScaleLock,
}: CanvasResizeHandlesProps) {
  const { t } = useTranslation();
  const { formatLength } = useLengthFormat();
  const plot = useRoomStore((s) => s.plot);
  const setPlotSize = useRoomStore((s) => s.setPlotSize);
  const [active, setActive] = useState(false);
  const drag = useRef<{
    axis: Axis;
    x: number;
    y: number;
    start: PlotSize;
    scale: number;
  } | null>(null);

  const onPointerDown =
    (axis: Axis) => (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Not essential.
      }
      drag.current = {
        axis,
        x: e.clientX,
        y: e.clientY,
        start: plot,
        scale: pxPerInch,
      };
      onScaleLock(pxPerInch);
      setActive(true);
    };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const rooms = useRoomStore.getState().rooms;
    const minW = Math.max(
      MIN_PLOT_IN,
      ...rooms.map((r) => r.x_position + r.width),
    );
    const minL = Math.max(
      MIN_PLOT_IN,
      ...rooms.map((r) => r.y_position + r.length),
    );
    const width = d.axis.w
      ? clamp(
          snap(d.start.width + (e.clientX - d.x) / d.scale),
          minW,
          MAX_PLOT_IN,
        )
      : d.start.width;
    const length = d.axis.l
      ? clamp(
          snap(d.start.length + (e.clientY - d.y) / d.scale),
          minL,
          MAX_PLOT_IN,
        )
      : d.start.length;
    setPlotSize({ width, length });
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    onScaleLock(null);
    setActive(false);
  };

  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h.key}
          role="separator"
          aria-label={t("actions.resize_plot")}
          title={t("actions.resize_plot")}
          data-html2canvas-ignore
          className="group absolute touch-none"
          style={{ ...h.style, cursor: h.cursor, zIndex: 50 }}
          onPointerDown={onPointerDown(h.axis)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className={`h-full w-full rounded-sm transition-colors ${
              active ? "" : "group-hover:bg-indigo-200/70"
            }`}
            style={
              h.key === "se"
                ? { background: "#fff", border: `2px solid ${SWAP_COLOR}` }
                : active
                  ? { background: "rgba(79,70,229,0.25)" }
                  : undefined
            }
          />
        </div>
      ))}
      {active && (
        <div
          data-html2canvas-ignore
          className="pointer-events-none absolute rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow"
          style={{ right: 8, bottom: 8, zIndex: 51 }}
        >
          {t("canvas.resize_badge", {
            width: formatLength(plot.width),
            length: formatLength(plot.length),
          })}
        </div>
      )}
    </>
  );
}
