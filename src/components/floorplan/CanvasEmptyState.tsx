"use client";

import { AppstoreAddOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export default function CanvasEmptyState() {
  const { t } = useTranslation();
  return (
    <div
      data-html2canvas-ignore
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-slate-400"
    >
      <AppstoreAddOutlined className="text-4xl" />
      <p className="text-base font-medium text-slate-500">
        {t("canvas.empty_title")}
      </p>
      <p className="max-w-sm text-sm">{t("canvas.empty_hint")}</p>
    </div>
  );
}
