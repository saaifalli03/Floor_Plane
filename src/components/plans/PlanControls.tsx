"use client";

import { useRef, useState } from "react";
import { Badge, Dropdown, Space, type MenuProps } from "antd";
import {
  DownloadOutlined,
  DownOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { usePlanActions } from "@/hooks/usePlanActions";
import { usePlansStore } from "@/store/usePlansStore";
import { useRoomStore } from "@/store/useRoomStore";
import { PLAN_FILE_EXTENSION } from "@/utils/planFile";
import PlanNameModal from "./PlanNameModal";
import PlansDrawer from "./PlansDrawer";

/** Header controls: Save (with Save as / file options) and My plans. */
export default function PlanControls() {
  const { t } = useTranslation();
  const actions = usePlanActions();
  const planCount = usePlansStore((s) => s.plans.length);
  const currentName = useRoomStore((s) => s.currentPlanName);
  const [naming, setNaming] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const openFile = () => fileInput.current?.click();
  const defaultName =
    currentName || t("plans.default_name", { n: planCount + 1 });

  const menu: MenuProps["items"] = [
    { key: "save_as", icon: <SaveOutlined />, label: t("plans.save_as") },
    { key: "download", icon: <DownloadOutlined />, label: t("plans.download") },
    {
      key: "open_file",
      icon: <FolderOpenOutlined />,
      label: t("plans.open_file"),
    },
    { type: "divider" },
    { key: "new", icon: <FileAddOutlined />, label: t("plans.new_plan") },
  ];
  const onMenu: MenuProps["onClick"] = ({ key }) => {
    if (key === "save_as") setNaming(true);
    else if (key === "download") actions.download();
    else if (key === "open_file") openFile();
    else if (key === "new") actions.newPlan();
  };

  return (
    <>
      <Space.Compact>
        <PrimaryButton
          variantType="default"
          icon={<SaveOutlined />}
          onClick={() => {
            if (!actions.save()) setNaming(true);
          }}
        >
          {t("plans.save")}
        </PrimaryButton>
        <Dropdown
          menu={{ items: menu, onClick: onMenu }}
          placement="bottomRight"
        >
          <PrimaryButton
            variantType="default"
            icon={<DownOutlined />}
            aria-label={t("plans.more_options")}
          />
        </Dropdown>
      </Space.Compact>
      <Badge count={planCount} size="small" color="#4f46e5" offset={[-4, 4]}>
        <PrimaryButton
          variantType="default"
          icon={<UnorderedListOutlined />}
          onClick={() => setDrawer(true)}
        >
          {t("plans.my_plans")}
        </PrimaryButton>
      </Badge>

      <input
        ref={fileInput}
        type="file"
        accept={`${PLAN_FILE_EXTENSION},.json,application/json`}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow choosing the same file again
          if (file) {
            setDrawer(false);
            void actions.importFile(file);
          }
        }}
      />
      <PlanNameModal
        open={naming}
        title={t("plans.save_title")}
        okText={t("plans.save")}
        initialName={defaultName}
        onSubmit={actions.saveAs}
        onClose={() => setNaming(false)}
      />
      <PlansDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        onOpenFile={openFile}
      />
    </>
  );
}
