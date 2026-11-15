"use client";

import { Empty } from "antd";
import { useTranslation } from "react-i18next";
import { ROOM_COLORS } from "@/constants/floorPlan";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import { useRoomStore } from "@/store/useRoomStore";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import { areaSqFt } from "@/utils/geometry";
import RoomActions from "./RoomActions";

export default function RoomList() {
  const { t } = useTranslation();
  const roomLabel = useRoomLabel();
  const { formatDimensions } = useLengthFormat();
  const rooms = useRoomStore((s) => s.rooms);
  const selectedId = useRoomStore((s) => s.selectedId);
  const selectRoom = useRoomStore((s) => s.selectRoom);

  if (rooms.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t("sidebar.empty_rooms")}
      />
    );
  }

  return (
    <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto lg:max-h-none">
      {rooms.map((room) => {
        const colors = ROOM_COLORS[room.type];
        const active = room.id === selectedId;
        return (
          <li
            key={room.id}
            onClick={() => selectRoom(room.id)}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
              active
                ? "bg-indigo-50 ring-1 ring-indigo-300"
                : "hover:bg-slate-50"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm border"
              style={{ background: colors.fill, borderColor: colors.border }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">
                {roomLabel(room)}
              </div>
              <div className="text-xs text-slate-500">
                {formatDimensions(room.width, room.length)} ·{" "}
                {t("area_value", { area: areaSqFt(room.width, room.length) })}
              </div>
            </div>
            <RoomActions roomId={room.id} />
          </li>
        );
      })}
    </ul>
  );
}
