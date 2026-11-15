"use client";

import { Select, Tooltip } from "antd";
import { DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import FeetInchesInput from "@/components/common/FeetInchesInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import { useRoomStore } from "@/store/useRoomStore";
import { DOOR_KINDS, WALLS, type Door, type Room } from "@/types/room";
import { wallLength } from "@/utils/doors";
import { INCHES_PER_FOOT } from "@/constants/floorPlan";

export interface DoorRowProps {
  room: Room;
  door: Door;
  index: number;
}

/** Editable controls for one door: wall, position along it, width, hinge side. */
export default function DoorRow({ room, door, index }: DoorRowProps) {
  const { t } = useTranslation();
  const updateDoor = useRoomStore((s) => s.updateDoor);
  const removeDoor = useRoomStore((s) => s.removeDoor);
  const maxFeet = Math.floor(wallLength(room, door.wall) / INCHES_PER_FOOT);

  const wallOptions = WALLS.map((value) => ({
    value,
    label: t(`walls.${value}`),
  }));
  const kindOptions = DOOR_KINDS.map((value) => ({
    value,
    label: t(`doors.kinds.${value}`),
  }));
  const update = (patch: Partial<Omit<Door, "id">>) =>
    updateDoor(room.id, door.id, patch);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">
          {t("doors.door_n", { n: index + 1 })}
        </span>
        <div className="flex gap-1">
          <Tooltip title={t("doors.flip")}>
            <PrimaryButton
              variantType={door.flip ? "primary" : "text"}
              size="small"
              aria-label={t("doors.flip")}
              icon={<SwapOutlined />}
              onClick={() => update({ flip: !door.flip })}
            />
          </Tooltip>
          <Tooltip title={t("actions.remove_door")}>
            <PrimaryButton
              variantType="text"
              size="small"
              danger
              aria-label={t("actions.remove_door")}
              icon={<DeleteOutlined />}
              onClick={() => removeDoor(room.id, door.id)}
            />
          </Tooltip>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        {t("doors.kind")}
        <Select
          size="small"
          value={door.kind ?? "swing"}
          options={kindOptions}
          onChange={(kind) => update({ kind })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        {t("doors.wall")}
        <Select
          size="small"
          value={door.wall}
          options={wallOptions}
          onChange={(wall) => update({ wall })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        {t("doors.position")}
        <FeetInchesInput
          value={door.offset}
          maxFeet={maxFeet}
          onChange={(offset) => update({ offset })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        {t("doors.width")}
        <FeetInchesInput
          value={door.width}
          maxFeet={maxFeet}
          onChange={(width) => update({ width })}
        />
      </label>
    </div>
  );
}
