"use client";

import { Select, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import FeetInchesInput from "@/components/common/FeetInchesInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import { INCHES_PER_FOOT } from "@/constants/floorPlan";
import { WALLS, type Room, type WallItem } from "@/types/room";
import { wallLength } from "@/utils/doors";

export interface WallItemRowProps {
  room: Room;
  item: WallItem;
  /** Already-translated labels. */
  title: string;
  positionLabel: string;
  widthLabel: string;
  removeLabel: string;
  /** Tailwind border colour class for the card. */
  borderClass: string;
  onUpdate: (patch: Partial<Omit<WallItem, "id">>) => void;
  onRemove: () => void;
}

/** Editable controls for a window or vent: wall, position along it, width. */
export default function WallItemRow({
  room,
  item,
  title,
  positionLabel,
  widthLabel,
  removeLabel,
  borderClass,
  onUpdate,
  onRemove,
}: WallItemRowProps) {
  const { t } = useTranslation();
  const maxFeet = Math.floor(wallLength(room, item.wall) / INCHES_PER_FOOT);
  const wallOptions = WALLS.map((value) => ({
    value,
    label: t(`walls.${value}`),
  }));

  return (
    <div className={`flex flex-col gap-2 rounded-md border p-2 ${borderClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{title}</span>
        <Tooltip title={removeLabel}>
          <PrimaryButton
            variantType="text"
            size="small"
            danger
            aria-label={removeLabel}
            icon={<DeleteOutlined />}
            onClick={onRemove}
          />
        </Tooltip>
      </div>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        {t("doors.wall")}
        <Select
          size="small"
          value={item.wall}
          options={wallOptions}
          onChange={(wall) => onUpdate({ wall })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        {positionLabel}
        <FeetInchesInput
          value={item.offset}
          maxFeet={maxFeet}
          onChange={(offset) => onUpdate({ offset })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        {widthLabel}
        <FeetInchesInput
          value={item.width}
          maxFeet={maxFeet}
          onChange={(width) => onUpdate({ width })}
        />
      </label>
    </div>
  );
}
