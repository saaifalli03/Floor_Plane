"use client";

import { Tag, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { usePlanStatus } from "@/hooks/usePlanActions";
import { useStorageStatus } from "@/store/browserStorage";

/** The open plan's name and whether it's saved, under the app title. */
export default function PlanStatusLine() {
  const { t } = useTranslation();
  const { name, status } = usePlanStatus();
  const storageFailed = useStorageStatus((s) => s.failed);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-slate-700">
        {name || t("plans.untitled")}
      </span>
      {status === "saved" && <Tag color="green">{t("plans.status_saved")}</Tag>}
      {status === "unsaved" && (
        <Tooltip title={t("plans.autosave_hint")}>
          <Tag color="orange">{t("plans.status_unsaved")}</Tag>
        </Tooltip>
      )}
      {storageFailed && (
        <Tooltip title={t("plans.storage_failed")}>
          <Tag color="red" icon={<WarningOutlined />}>
            {t("plans.storage_failed_short")}
          </Tag>
        </Tooltip>
      )}
    </div>
  );
}
