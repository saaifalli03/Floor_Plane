"use client";

import { Segmented, Select, Switch, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import FeetInchesInput from "@/components/common/FeetInchesInput";
import { INCHES_PER_FOOT, IN_ROOM_STAIRS } from "@/constants/floorPlan";
import { useRoomStore } from "@/store/useRoomStore";
import { WALLS, type Room } from "@/types/room";
import { wallLength } from "@/utils/doors";
import {
  canHaveStairsInside,
  defaultInRoomStairs,
  hasWalls,
} from "@/utils/inRoomStairs";

/**
 * Walls on/off, and a flight of stairs built inside the room (with storage under it).
 * Changes apply straight away.
 */
export default function RoomStructure({ room }: { room: Room }) {
  const { t } = useTranslation();
  const setRoomWalls = useRoomStore((s) => s.setRoomWalls);
  const setRoomStairs = useRoomStore((s) => s.setRoomStairs);
  const stairs = room.stairs;
  const fits = !!defaultInRoomStairs(room);
  const along = stairs ? wallLength(room, stairs.wall) : 0;
  const across = stairs
    ? stairs.wall === "top" || stairs.wall === "bottom"
      ? room.length
      : room.width
    : 0;
  const horizontal = stairs?.wall === "top" || stairs?.wall === "bottom";
  const ft = (inches: number) => Math.floor(inches / INCHES_PER_FOOT);

  const field = (label: string, control: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      {control}
    </label>
  );

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t("structure.title")}
      </span>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm text-slate-700">{t("structure.walls")}</span>
          <span className="text-xs text-slate-400">
            {t("structure.walls_hint")}
          </span>
        </div>
        <Switch
          checked={hasWalls(room)}
          onChange={(on) => setRoomWalls(room.id, on)}
          aria-label={t("structure.walls")}
        />
      </div>

      {canHaveStairsInside(room) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-slate-700">
                {t("structure.stairs")}
              </span>
              <span className="text-xs text-slate-400">
                {t("structure.stairs_hint")}
              </span>
            </div>
            <Tooltip title={fits ? undefined : t("structure.too_small")}>
              <Switch
                checked={!!stairs}
                disabled={!fits && !stairs}
                onChange={(on) => setRoomStairs(room.id, on ? true : null)}
                aria-label={t("structure.stairs")}
              />
            </Tooltip>
          </div>

          {stairs && (
            <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
              {field(
                t("structure.along_wall"),
                <Select
                  size="small"
                  value={stairs.wall}
                  onChange={(wall) => setRoomStairs(room.id, { wall })}
                  options={WALLS.map((value) => ({
                    value,
                    label: t(`walls.${value}`),
                  }))}
                />,
              )}
              {field(
                t("structure.climbs"),
                <Segmented
                  size="small"
                  block
                  value={stairs.reverse ? "back" : "forward"}
                  onChange={(v) =>
                    setRoomStairs(room.id, { reverse: v === "back" })
                  }
                  options={[
                    {
                      value: "forward",
                      label: horizontal
                        ? t("structure.left_to_right")
                        : t("structure.top_to_bottom"),
                    },
                    {
                      value: "back",
                      label: horizontal
                        ? t("structure.right_to_left")
                        : t("structure.bottom_to_top"),
                    },
                  ]}
                />,
              )}
              {field(
                t("structure.starts_at"),
                <FeetInchesInput
                  value={stairs.offset}
                  maxFeet={ft(along - stairs.run)}
                  onChange={(offset) => setRoomStairs(room.id, { offset })}
                />,
              )}
              {field(
                t("structure.run"),
                <FeetInchesInput
                  value={stairs.run}
                  maxFeet={ft(along)}
                  onChange={(run) =>
                    setRoomStairs(room.id, {
                      run: Math.max(run, IN_ROOM_STAIRS.minRun),
                    })
                  }
                />,
              )}
              {field(
                t("structure.stair_width"),
                <FeetInchesInput
                  value={stairs.width}
                  maxFeet={ft(Math.min(IN_ROOM_STAIRS.maxWidth, across))}
                  onChange={(width) =>
                    setRoomStairs(room.id, {
                      width: Math.max(width, IN_ROOM_STAIRS.minWidth),
                    })
                  }
                />,
              )}
              <p className="text-xs text-slate-400">
                {t("structure.storage_note")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
