"use client";

import { ColorPicker, Select, Tooltip } from "antd";
import { CheckOutlined, UndoOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import {
  DEFAULT_FLOOR,
  DEFAULT_WALL_PAINT,
  PAINT_SWATCHES,
  wallPaintOf,
} from "@/constants/view3d";
import { useRoomStore } from "@/store/useRoomStore";
import { hasWalls } from "@/utils/inRoomStairs";
import { FLOOR_FINISHES, type FloorFinish, type Room } from "@/types/room";

/** Readable tick colour on top of a swatch. */
const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
};

/**
 * Wall paint and floor finish for one room, as seen in the 3D view. Changes apply
 * straight away (no Save needed).
 */
export default function RoomFinishes({ room }: { room: Room }) {
  const { t } = useTranslation();
  const setRoomFinish = useRoomStore((s) => s.setRoomFinish);
  const paint = wallPaintOf(room);
  const walled = hasWalls(room);
  const swatches = Array.from(
    new Set([DEFAULT_WALL_PAINT[room.type], ...PAINT_SWATCHES]),
  );

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("finishes.title")}
        </span>
        <span className="text-[11px] text-slate-400">{t("finishes.hint")}</span>
      </div>

      {walled && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-700">
            {t("finishes.wall_paint")}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {swatches.map((color) => {
              const active = color.toLowerCase() === paint.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={t("finishes.use_paint", { color })}
                  aria-pressed={active}
                  title={color}
                  onClick={() => setRoomFinish(room.id, { wallColor: color })}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] transition ${
                    active
                      ? "border-indigo-500 ring-2 ring-indigo-300"
                      : "border-slate-300 hover:scale-110"
                  }`}
                  style={{
                    background: color,
                    color: isDark(color) ? "#fff" : "#334155",
                  }}
                >
                  {active && <CheckOutlined />}
                </button>
              );
            })}
            <Tooltip title={t("finishes.custom_color")}>
              <ColorPicker
                size="small"
                value={paint}
                disabledAlpha
                onChangeComplete={(c) =>
                  setRoomFinish(room.id, { wallColor: c.toHexString() })
                }
              />
            </Tooltip>
            {room.wallColor && (
              <PrimaryButton
                variantType="link"
                size="small"
                icon={<UndoOutlined />}
                onClick={() => setRoomFinish(room.id, { wallColor: undefined })}
              >
                {t("finishes.reset")}
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-slate-700">{t("finishes.floor")}</span>
        <Select<FloorFinish>
          size="small"
          value={room.floorFinish ?? DEFAULT_FLOOR[room.type]}
          onChange={(floorFinish) => setRoomFinish(room.id, { floorFinish })}
          options={FLOOR_FINISHES.map((value) => ({
            value,
            label: t(`finishes.floors.${value}`),
          }))}
        />
      </label>
    </div>
  );
}
