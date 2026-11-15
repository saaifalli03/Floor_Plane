"use client";

import { ApartmentOutlined, DownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { useAutoDoors, type AutoPlaceMode } from "@/hooks/useAutoDoors";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import PanelCard from "@/components/common/PanelCard";
import { useRoomStore } from "@/store/useRoomStore";
import { totalAreaSqFt } from "@/utils/geometry";
import DoorEditor from "./DoorEditor";
import PlotSettings from "./PlotSettings";
import RoomEditor from "./RoomEditor";
import RoomForm from "./RoomForm";
import RoomList from "./RoomList";
import TemplatesPanel from "./TemplatesPanel";

export default function SidebarController() {
  const { t } = useTranslation();
  const rooms = useRoomStore((s) => s.rooms);
  const selectedRoom = useRoomStore((s) =>
    s.rooms.find((r) => r.id === s.selectedId),
  );
  const roomLabel = useRoomLabel();
  const autoDoors = useAutoDoors();

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
      <PanelCard title={t("sidebar.plot_title")}>
        <PlotSettings />
      </PanelCard>
      <PanelCard title={t("sidebar.templates_title")}>
        <TemplatesPanel />
      </PanelCard>
      <PanelCard title={t("sidebar.create_title")}>
        <RoomForm />
      </PanelCard>
      <PanelCard
        title={t("sidebar.rooms_title", { count: rooms.length })}
        extra={
          rooms.length > 0 && (
            <span className="text-xs text-slate-500">
              {t("sidebar.total_area", { area: totalAreaSqFt(rooms) })}
            </span>
          )
        }
      >
        <RoomList />
      </PanelCard>
      <PanelCard
        title={
          selectedRoom
            ? t("edit_room.title_room", { room: roomLabel(selectedRoom) })
            : t("edit_room.title")
        }
      >
        <RoomEditor />
      </PanelCard>
      <PanelCard
        title={
          selectedRoom
            ? t("doors.panel_title_room", { room: roomLabel(selectedRoom) })
            : t("doors.panel_title")
        }
        extra={
          <Dropdown
            disabled={rooms.length === 0}
            trigger={["click"]}
            menu={{
              items: [
                { key: "both", label: t("actions.auto_both") },
                { key: "doors", label: t("actions.auto_doors_only") },
                { key: "windows", label: t("actions.auto_windows_only") },
                { key: "vents", label: t("actions.auto_vents_only") },
              ],
              onClick: ({ key }) => autoDoors(key as AutoPlaceMode),
            }}
          >
            <PrimaryButton
              variantType="link"
              size="small"
              icon={<ApartmentOutlined />}
              disabled={rooms.length === 0}
            >
              {t("actions.auto_place")} <DownOutlined className="text-[10px]" />
            </PrimaryButton>
          </Dropdown>
        }
      >
        <DoorEditor />
      </PanelCard>
    </aside>
  );
}
