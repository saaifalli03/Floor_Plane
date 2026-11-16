"use client";

import { Select } from "antd";
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import type { ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { NO_OPENING_TYPES } from "@/constants/floorPlan";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import { useRoomStore } from "@/store/useRoomStore";
import type { Part } from "@/utils/furniture";
import { buildWalkWorld, roomViewpoint } from "@/utils/walk";
import type { WalkInput } from "./WalkController";

export interface WalkOverlayProps {
  mode: "walk" | "tour";
  inputRef: RefObject<WalkInput>;
  roomId: string | null;
  locked: boolean;
  furniture: Part[];
}

type Direction = "forward" | "back" | "left" | "right";

/** Hold-to-move button for touch screens (and anyone who prefers clicking). */
function PadButton({
  inputRef,
  dir,
  label,
  icon,
  className,
}: {
  inputRef: RefObject<WalkInput>;
  dir: Direction;
  label: string;
  icon: ReactNode;
  className: string;
}) {
  const press = () => {
    inputRef.current[dir] = true;
  };
  const release = () => {
    inputRef.current[dir] = false;
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 touch-none select-none items-center justify-center rounded-lg bg-white/85 text-slate-700 shadow ring-1 ring-slate-300 active:bg-indigo-100 ${className}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {icon}
    </button>
  );
}

/** HUD drawn over the 3D canvas while walking or touring: where you are, hints, pad. */
export default function WalkOverlay({
  mode,
  inputRef,
  roomId,
  locked,
  furniture,
}: WalkOverlayProps) {
  const { t } = useTranslation();
  const rooms = useRoomStore((s) => s.rooms);
  const plot = useRoomStore((s) => s.plot);
  const roomLabel = useRoomLabel();
  const current = rooms.find((r) => r.id === roomId);
  const reachable = rooms.filter((r) => !NO_OPENING_TYPES.includes(r.type));

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none"
      data-html2canvas-ignore
    >
      {/* Where you are. */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-medium text-white shadow">
        <EnvironmentOutlined />
        {current ? roomLabel(current) : t("tour.outside")}
      </div>

      {mode === "walk" && (
        <>
          <div className="pointer-events-auto absolute right-3 top-3 w-44">
            <Select
              size="small"
              className="w-full"
              placeholder={t("tour.go_to_room")}
              value={null}
              options={reachable.map((r) => ({
                value: r.id,
                label: roomLabel(r),
              }))}
              onChange={(id: string) => {
                const room = rooms.find((r) => r.id === id);
                if (room)
                  inputRef.current.teleport = roomViewpoint(
                    room,
                    buildWalkWorld(rooms, plot, furniture),
                  );
              }}
            />
          </div>

          {/* Crosshair while the mouse is captured. */}
          {locked && (
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-900/60" />
          )}

          <p className="absolute bottom-3 left-3 max-w-[60%] rounded-md bg-white/85 px-2 py-1 text-[11px] text-slate-600 shadow">
            {locked ? t("tour.hint_locked") : t("tour.hint_unlocked")}
          </p>

          <div className="pointer-events-auto absolute bottom-3 right-3 grid grid-cols-3 gap-1">
            <PadButton
              inputRef={inputRef}
              dir="forward"
              label={t("tour.move_forward")}
              icon={<ArrowUpOutlined />}
              className="col-start-2"
            />
            <PadButton
              inputRef={inputRef}
              dir="left"
              label={t("tour.move_left")}
              icon={<ArrowLeftOutlined />}
              className="col-start-1"
            />
            <PadButton
              inputRef={inputRef}
              dir="back"
              label={t("tour.move_back")}
              icon={<ArrowDownOutlined />}
              className="col-start-2"
            />
            <PadButton
              inputRef={inputRef}
              dir="right"
              label={t("tour.move_right")}
              icon={<ArrowRightOutlined />}
              className="col-start-3"
            />
          </div>
        </>
      )}
    </div>
  );
}
