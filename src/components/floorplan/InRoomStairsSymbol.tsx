"use client";

import { useTranslation } from "react-i18next";
import type { InRoomStairs, Room } from "@/types/room";
import { inRoomStairsFoot, inRoomStairsRect } from "@/utils/inRoomStairs";
import StairsSymbol from "./StairsSymbol";

export interface InRoomStairsSymbolProps {
  room: Room;
  stairs: InRoomStairs;
  pxPerInch: number;
  color: string;
}

/**
 * A flight of stairs drawn inside its room: treads and an UP arrow, with a hatched
 * band at the high end marking the storage cupboard underneath.
 */
export default function InRoomStairsSymbol({
  room,
  stairs,
  pxPerInch,
  color,
}: InRoomStairsSymbolProps) {
  const { t } = useTranslation();
  const r = inRoomStairsRect(room, stairs);
  const foot = inRoomStairsFoot(stairs);
  // Storage sits under the upper part of the flight (where there's headroom).
  const share = 0.55;
  const horizontal = stairs.wall === "top" || stairs.wall === "bottom";
  const storage: React.CSSProperties = horizontal
    ? {
        top: 0,
        bottom: 0,
        width: `${share * 100}%`,
        [foot === "left" ? "right" : "left"]: 0,
      }
    : {
        left: 0,
        right: 0,
        height: `${share * 100}%`,
        [foot === "top" ? "bottom" : "top"]: 0,
      };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: r.x * pxPerInch,
        top: r.y * pxPerInch,
        width: r.width * pxPerInch,
        height: r.length * pxPerInch,
        border: `1.5px solid ${color}`,
        background: "rgba(255,255,255,0.75)",
      }}
    >
      <div
        className="absolute"
        style={{
          ...storage,
          backgroundImage: `repeating-linear-gradient(45deg, ${color}22 0 4px, transparent 4px 9px)`,
        }}
      />
      <StairsSymbol
        width={r.width}
        length={r.length}
        pxPerInch={pxPerInch}
        color={color}
        entry={foot}
      />
      {r.width * pxPerInch > 60 && r.length * pxPerInch > 18 && (
        <span
          className="absolute rounded bg-white/90 px-1 text-[8px] font-medium leading-tight"
          style={{
            color,
            ...(horizontal
              ? { top: 1, [foot === "left" ? "right" : "left"]: 2 }
              : { left: 1, [foot === "top" ? "bottom" : "top"]: 2 }),
          }}
        >
          {t("stairs.storage_below")}
        </span>
      )}
    </div>
  );
}
