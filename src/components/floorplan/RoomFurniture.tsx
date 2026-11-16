"use client";

import { useMemo } from "react";
import { Checkbox, Switch } from "antd";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { useRoomStore } from "@/store/useRoomStore";
import type { Room } from "@/types/room";
import { furnitureOptions } from "@/utils/furniture";

/**
 * Take furniture out of a room in the 3D view: all of it, or piece by piece.
 * A removed piece leaves its spot empty, so nothing else in the room moves.
 */
export default function RoomFurniture({ room }: { room: Room }) {
  const { t } = useTranslation();
  const rooms = useRoomStore((s) => s.rooms);
  const setRoomFurniture = useRoomStore((s) => s.setRoomFurniture);
  // Everything this room gets (whether removed or not), given its size and layout.
  const options = useMemo(
    () => furnitureOptions(rooms, room.id),
    [rooms, room.id],
  );
  const on = room.furniture !== false;
  const hidden = new Set(room.hiddenFurniture ?? []);
  const shown = options.filter((o) => !hidden.has(o.key)).map((o) => o.key);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("room_furniture.title")}
        </span>
        <span className="text-[11px] text-slate-400">
          {t("room_furniture.hint")}
        </span>
      </div>

      {options.length === 0 ? (
        <p className="text-xs text-slate-400">
          {room.type === "stairs" ||
          room.type === "vent_shaft" ||
          room.type === "open_space"
            ? t("room_furniture.none")
            : t("room_furniture.none_fit")}
        </p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-slate-700">
                {t("room_furniture.switch")}
              </span>
              <span className="text-xs text-slate-400">
                {t("room_furniture.switch_hint")}
              </span>
            </div>
            <Switch
              checked={on}
              onChange={(furniture) => setRoomFurniture(room.id, { furniture })}
              aria-label={t("room_furniture.switch")}
            />
          </div>

          {on && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t("room_furniture.pieces")}
                </span>
                {hidden.size > 0 && (
                  <PrimaryButton
                    variantType="link"
                    size="small"
                    onClick={() =>
                      setRoomFurniture(room.id, { hiddenFurniture: [] })
                    }
                  >
                    {t("room_furniture.show_all")}
                  </PrimaryButton>
                )}
              </div>
              <Checkbox.Group
                className="flex flex-col gap-1"
                value={shown}
                onChange={(checked) =>
                  setRoomFurniture(room.id, {
                    hiddenFurniture: options
                      .map((o) => o.key)
                      .filter((k) => !checked.includes(k)),
                  })
                }
                options={options.map(({ key, count }) => ({
                  value: key,
                  label: (
                    <span className="text-sm text-slate-700">
                      {t(`room_furniture.items.${key}`)}
                      {count > 1 && (
                        <span className="ml-1 text-xs text-slate-400">
                          {t("room_furniture.count", { count })}
                        </span>
                      )}
                    </span>
                  ),
                }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
