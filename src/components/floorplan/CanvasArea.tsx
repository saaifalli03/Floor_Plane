"use client";

import dynamic from "next/dynamic";
import { Segmented, Spin } from "antd";
import { AppstoreOutlined, BoxPlotOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useRoomStore, type ViewMode } from "@/store/useRoomStore";
import MapCanvas from "./MapCanvas";

function Loading3D() {
  const { t } = useTranslation();
  return (
    <div className="flex h-[65vh] min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
      <Spin description={t("view3d.loading")}>
        <div className="h-16 w-48" />
      </Spin>
    </div>
  );
}

// three.js needs the browser (WebGL), and is only downloaded when the 3D view is opened.
const FloorPlan3D = dynamic(() => import("@/components/view3d/FloorPlan3D"), {
  ssr: false,
  loading: () => <Loading3D />,
});

/** The main work area: a 2D/3D switch and whichever view is active. */
export default function CanvasArea() {
  const { t } = useTranslation();
  const viewMode = useRoomStore((s) => s.viewMode);
  const setViewMode = useRoomStore((s) => s.setViewMode);
  const hasRooms = useRoomStore((s) => s.rooms.length > 0);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
      <Segmented<ViewMode>
        value={viewMode}
        onChange={setViewMode}
        options={[
          {
            value: "2d",
            label: t("view3d.view_2d"),
            icon: <AppstoreOutlined />,
          },
          {
            value: "3d",
            label: t("view3d.view_3d"),
            icon: <BoxPlotOutlined />,
          },
        ]}
        className="self-start"
      />
      {viewMode === "2d" ? (
        <MapCanvas />
      ) : (
        <>
          {!hasRooms && (
            <p className="text-sm text-slate-500">{t("view3d.empty")}</p>
          )}
          <FloorPlan3D />
        </>
      )}
    </section>
  );
}
