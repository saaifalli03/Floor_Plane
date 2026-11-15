"use client";

import { useTranslation } from "react-i18next";
import { STAIR_TREAD_IN } from "@/constants/floorPlan";
import type { Wall } from "@/types/room";

export interface StairsSymbolProps {
  /** Room size in inches and px. */
  width: number;
  length: number;
  pxPerInch: number;
  color: string;
  /** Wall at the foot of the flight (where you step on); the arrow points away from it. */
  foot?: Wall;
}

/**
 * Plan symbol for a straight flight of stairs: tread lines across the run, plus an
 * arrow along the centre pointing up the flight with an "UP" label at its foot.
 * The flight runs along the room's longer side.
 */
export default function StairsSymbol({
  width,
  length,
  pxPerInch,
  color,
  foot,
}: StairsSymbolProps) {
  const { t } = useTranslation();
  const vertical = length >= width;
  const run = (vertical ? length : width) * pxPerInch;
  const span = (vertical ? width : length) * pxPerInch;
  const step = STAIR_TREAD_IN * pxPerInch;
  const treads = Math.max(1, Math.floor(run / step));
  const gap = run / treads;
  const head = Math.max(5, Math.min(span * 0.15, 10));
  // Default foot is the bottom (vertical flight) or left (horizontal flight) end.
  const reversed = vertical ? foot === "top" : foot === "right";
  const mid = span / 2;
  const shaftStart = gap * 0.5;
  const shaftEnd = head + 2;

  const shaft = vertical
    ? {
        left: mid - 0.75,
        width: 1.5,
        top: reversed ? shaftStart : shaftEnd,
        bottom: reversed ? shaftEnd : shaftStart,
      }
    : {
        top: mid - 0.75,
        height: 1.5,
        left: reversed ? shaftEnd : shaftStart,
        right: reversed ? shaftStart : shaftEnd,
      };

  const transparentA = `${head / 2}px solid transparent`;
  const arrowHead = vertical
    ? {
        left: mid - head / 2,
        ...(reversed ? { bottom: 2 } : { top: 2 }),
        borderLeft: transparentA,
        borderRight: transparentA,
        [reversed ? "borderTop" : "borderBottom"]: `${head}px solid ${color}`,
      }
    : {
        top: mid - head / 2,
        ...(reversed ? { left: 2 } : { right: 2 }),
        borderTop: transparentA,
        borderBottom: transparentA,
        [reversed ? "borderRight" : "borderLeft"]: `${head}px solid ${color}`,
      };

  const label = vertical
    ? {
        left: mid,
        transform: "translateX(-50%)",
        ...(reversed ? { top: 2 } : { bottom: 2 }),
      }
    : {
        top: mid,
        transform: "translateY(-50%)",
        ...(reversed ? { right: 2 } : { left: 2 }),
      };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {Array.from({ length: treads - 1 }, (_, i) => {
        const at = (i + 1) * gap;
        return (
          <div
            key={i}
            className="absolute"
            style={
              vertical
                ? { left: 0, right: 0, top: at, height: 1, background: color }
                : { top: 0, bottom: 0, left: at, width: 1, background: color }
            }
          />
        );
      })}

      {/* Direction arrow: shaft from the foot of the flight, head at the top. */}
      <div className="absolute" style={{ ...shaft, background: color }} />
      <div className="absolute h-0 w-0" style={arrowHead} />
      <span
        className="absolute rounded px-1 text-[9px] font-bold leading-tight"
        style={{ color, background: "rgba(255,255,255,0.9)", ...label }}
      >
        {t("stairs.up")}
      </span>
    </div>
  );
}
