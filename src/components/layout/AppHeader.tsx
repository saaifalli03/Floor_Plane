"use client";

import { Popconfirm } from "antd";
import { ClearOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useRoomStore } from "@/store/useRoomStore";

export default function AppHeader() {
  const { t } = useTranslation();
  const hasRooms = useRoomStore((s) => s.rooms.length > 0);
  const clearRooms = useRoomStore((s) => s.clearRooms);
  const { exportPdf, exporting } = usePdfExport();

  return (
    <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{t("app.title")}</h1>
        <p className="text-sm text-slate-500">{t("app.subtitle")}</p>
      </div>
      <div className="flex gap-2">
        <Popconfirm
          title={t("actions.confirm_clear")}
          okText={t("actions.yes")}
          cancelText={t("actions.no")}
          onConfirm={clearRooms}
          disabled={!hasRooms}
        >
          <PrimaryButton variantType="default" icon={<ClearOutlined />} disabled={!hasRooms}>
            {t("actions.clear_all")}
          </PrimaryButton>
        </Popconfirm>
        <PrimaryButton icon={<FilePdfOutlined />} loading={exporting} onClick={exportPdf}>
          {exporting ? t("actions.exporting") : t("actions.export_pdf")}
        </PrimaryButton>
      </div>
    </header>
  );
}
