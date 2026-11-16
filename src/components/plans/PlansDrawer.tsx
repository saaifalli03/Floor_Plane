"use client";

import { useState } from "react";
import { Drawer, Popconfirm, Tag, Tooltip } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FolderOpenOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import { usePlanActions, usePlanStatus } from "@/hooks/usePlanActions";
import { usePlansStore, type SavedPlan } from "@/store/usePlansStore";
import { useRoomStore } from "@/store/useRoomStore";
import PlanNameModal from "./PlanNameModal";
import PlanThumbnail from "./PlanThumbnail";

export interface PlansDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenFile: () => void;
}

/** "My plans": every plan saved in this browser, to open, rename, copy or delete. */
export default function PlansDrawer({
  open,
  onClose,
  onOpenFile,
}: PlansDrawerProps) {
  const { t, i18n } = useTranslation();
  const plans = usePlansStore((s) => s.plans);
  const currentId = useRoomStore((s) => s.currentPlanId);
  const actions = usePlanActions();
  const { status } = usePlanStatus();
  const { formatDimensions } = useLengthFormat();
  const [renaming, setRenaming] = useState<SavedPlan | null>(null);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("plans.drawer_title")}
      size="default"
      footer={
        <div className="flex flex-col gap-2">
          <PrimaryButton
            variantType="default"
            icon={<FolderOpenOutlined />}
            onClick={onOpenFile}
            block
          >
            {t("plans.open_file")}
          </PrimaryButton>
          <p className="text-xs text-slate-500">{t("plans.storage_note")}</p>
        </div>
      }
    >
      {plans.length === 0 ? (
        <p className="text-sm text-slate-500">{t("plans.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((saved) => {
            const isCurrent = saved.id === currentId;
            return (
              <li
                key={saved.id}
                className={`flex flex-col gap-2 rounded-lg border p-2 ${
                  isCurrent
                    ? "border-indigo-300 bg-indigo-50/60"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <PlanThumbnail plan={saved.plan} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate text-sm font-medium text-slate-800"
                        title={saved.name}
                      >
                        {saved.name}
                      </span>
                      {isCurrent && (
                        <Tag color="purple">{t("plans.current")}</Tag>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {t("plans.rooms_count", {
                        count: saved.plan.rooms.length,
                      })}{" "}
                      ·{" "}
                      {formatDimensions(
                        saved.plan.plot.width,
                        saved.plan.plot.length,
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("plans.saved_at", {
                        date: dateFormat.format(new Date(saved.savedAt)),
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <PrimaryButton
                    size="small"
                    icon={isCurrent ? <UndoOutlined /> : <FolderOpenOutlined />}
                    // The open plan can be reloaded only to throw away unsaved changes.
                    disabled={isCurrent && status === "saved"}
                    onClick={() => {
                      actions.open(saved);
                      onClose();
                    }}
                  >
                    {isCurrent ? t("plans.revert") : t("plans.open")}
                  </PrimaryButton>
                  <div className="ml-auto flex items-center">
                    <Tooltip title={t("plans.rename")}>
                      <PrimaryButton
                        variantType="text"
                        size="small"
                        aria-label={t("plans.rename")}
                        icon={<EditOutlined />}
                        onClick={() => setRenaming(saved)}
                      />
                    </Tooltip>
                    <Tooltip title={t("plans.duplicate")}>
                      <PrimaryButton
                        variantType="text"
                        size="small"
                        aria-label={t("plans.duplicate")}
                        icon={<CopyOutlined />}
                        onClick={() => actions.duplicate(saved)}
                      />
                    </Tooltip>
                    <Tooltip title={t("plans.download")}>
                      <PrimaryButton
                        variantType="text"
                        size="small"
                        aria-label={t("plans.download")}
                        icon={<DownloadOutlined />}
                        onClick={() => actions.download(saved.name, saved.plan)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title={t("plans.confirm_delete", { name: saved.name })}
                      okText={t("plans.delete")}
                      okButtonProps={{ danger: true }}
                      cancelText={t("actions.cancel")}
                      onConfirm={() => actions.remove(saved)}
                    >
                      <Tooltip title={t("plans.delete")}>
                        <PrimaryButton
                          variantType="text"
                          size="small"
                          danger
                          aria-label={t("plans.delete")}
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <PlanNameModal
        open={!!renaming}
        title={t("plans.rename_title")}
        okText={t("plans.rename")}
        initialName={renaming?.name ?? ""}
        onSubmit={(name) => renaming && actions.rename(renaming.id, name)}
        onClose={() => setRenaming(null)}
      />
    </Drawer>
  );
}
