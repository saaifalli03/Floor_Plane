"use client";

import type { CSSProperties, SyntheticEvent } from "react";
import { Dropdown, Tooltip } from "antd";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { NO_OPENING_TYPES } from "@/constants/floorPlan";
import { useRoomStore } from "@/store/useRoomStore";
import { WALLS, type Room, type Wall, type WallItem } from "@/types/room";

const BUTTON = 20;
/** "+" sits just outside the wall; "−" sits just inside, on the item it removes. */
const OUTSIDE = 16;
const INSIDE = 18;

const stop = (e: SyntheticEvent) => e.stopPropagation();

const round: CSSProperties = {
  width: BUTTON,
  height: BUTTON,
  zIndex: 46,
  transform: "translate(-50%, -50%)",
};

const plusPosition: Record<Wall, CSSProperties> = {
  top: { left: "50%", top: -OUTSIDE },
  bottom: { left: "50%", top: `calc(100% + ${OUTSIDE}px)` },
  left: { left: -OUTSIDE, top: "50%" },
  right: { left: `calc(100% + ${OUTSIDE}px)`, top: "50%" },
};

/** Centre of an item along its wall, nudged into the room (px). */
const minusPosition = (
  item: WallItem,
  pxPerInch: number,
  widthPx: number,
  lengthPx: number,
): CSSProperties => {
  const along = (item.offset + item.width / 2) * pxPerInch;
  switch (item.wall) {
    case "top":
      return { left: along, top: INSIDE };
    case "bottom":
      return { left: along, top: lengthPx - INSIDE };
    case "left":
      return { left: INSIDE, top: along };
    case "right":
      return { left: widthPx - INSIDE, top: along };
  }
};

export interface WallEditButtonsProps {
  room: Room;
  pxPerInch: number;
  widthPx: number;
  lengthPx: number;
}

/**
 * On the selected room: a "+" on each wall that offers to add a door or window there,
 * and a "−" on every existing door and window to remove it.
 */
export default function WallEditButtons({
  room,
  pxPerInch,
  widthPx,
  lengthPx,
}: WallEditButtonsProps) {
  const { t } = useTranslation();
  const addDoor = useRoomStore((s) => s.addDoor);
  const addWindow = useRoomStore((s) => s.addWindow);
  const removeDoor = useRoomStore((s) => s.removeDoor);
  const removeWindow = useRoomStore((s) => s.removeWindow);
  const addVent = useRoomStore((s) => s.addVent);
  const removeVent = useRoomStore((s) => s.removeVent);
  const sealed = NO_OPENING_TYPES.includes(room.type);

  const removable = [
    ...(room.doors ?? []).map((item) => ({
      item,
      remove: () => removeDoor(room.id, item.id),
    })),
    ...(room.windows ?? []).map((item) => ({
      item,
      remove: () => removeWindow(room.id, item.id),
    })),
    ...(room.vents ?? []).map((item) => ({
      item,
      remove: () => removeVent(room.id, item.id),
    })),
  ];

  return (
    <>
      {WALLS.map((wall) => (
        <Dropdown
          key={wall}
          trigger={["click"]}
          menu={{
            items: [
              ...(sealed
                ? []
                : [
                    { key: "door", label: t("actions.add_door_here") },
                    { key: "window", label: t("actions.add_window_here") },
                  ]),
              { key: "vent", label: t("actions.add_vent_here") },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === "door") addDoor(room.id, wall);
              else if (key === "window") addWindow(room.id, wall);
              else addVent(room.id, wall);
            },
          }}
        >
          <button
            type="button"
            aria-label={t("actions.add_on_wall")}
            title={t("actions.add_on_wall")}
            data-html2canvas-ignore
            onPointerDown={stop}
            onClick={stop}
            className="absolute flex cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white shadow-md ring-2 ring-white hover:bg-indigo-700"
            style={{ ...round, ...plusPosition[wall] }}
          >
            <PlusOutlined />
          </button>
        </Dropdown>
      ))}

      {removable.map(({ item, remove }) => (
        <Tooltip key={item.id} title={t("actions.remove_item")}>
          <button
            type="button"
            aria-label={t("actions.remove_item")}
            data-html2canvas-ignore
            onPointerDown={stop}
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
            className="absolute flex cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-md ring-2 ring-white hover:bg-red-600"
            style={{
              ...round,
              ...minusPosition(item, pxPerInch, widthPx, lengthPx),
            }}
          >
            <MinusOutlined />
          </button>
        </Tooltip>
      ))}
    </>
  );
}
