"use client";

import { useState } from "react";
import { AppstoreOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import TemplatePickerModal from "./TemplatePickerModal";

export default function TemplatesPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <p className="mb-3 text-xs text-slate-500">
        {t("sidebar.templates_hint")}
      </p>
      <PrimaryButton
        variantType="default"
        icon={<AppstoreOutlined />}
        onClick={() => setOpen(true)}
        block
      >
        {t("actions.browse_templates")}
      </PrimaryButton>
      <TemplatePickerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
