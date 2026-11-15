"use client";

import { App, Tooltip } from "antd";
import { DeleteOutlined, RotateRightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { useRoomStore } from "@/store/useRoomStore";

/** Rotate / delete controls for a single room, reused in the list and on the canvas. */
export default function RoomActions({ roomId }: { roomId: string }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const rotateRoom = useRoomStore((s) => s.rotateRoom);
  const removeRoom = useRoomStore((s) => s.removeRoom);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className="flex gap-1" onPointerDown={stop} onKeyDown={stop}>
      <Tooltip title={t("actions.rotate")}>
        <PrimaryButton
          variantType="text"
          size="small"
          aria-label={t("actions.rotate")}
          icon={<RotateRightOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            if (!rotateRoom(roomId))
              message.warning(t("messages.rotate_blocked"));
          }}
        />
      </Tooltip>
      <Tooltip title={t("actions.delete")}>
        <PrimaryButton
          variantType="text"
          size="small"
          danger
          aria-label={t("actions.delete")}
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            removeRoom(roomId);
          }}
        />
      </Tooltip>
    </div>
  );
}
