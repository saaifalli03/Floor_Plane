"use client";

import { useEffect } from "react";
import { App, Form } from "antd";
import { ExpandOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import FormInput from "@/components/common/FormInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import {
  INCHES_PER_FOOT,
  MAX_PLOT_IN,
  MIN_PLOT_IN,
} from "@/constants/floorPlan";
import { useDimensionRules } from "@/hooks/useDimensionRules";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import { useRoomStore } from "@/store/useRoomStore";
import type { PlotSize } from "@/types/room";

/** Lets the user set the overall plot (canvas) dimensions in feet + inches. */
export default function PlotSettings() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { formatLength } = useLengthFormat();
  const plot = useRoomStore((s) => s.plot);
  const setPlotSize = useRoomStore((s) => s.setPlotSize);
  const [form] = Form.useForm<PlotSize>();
  const rules = useDimensionRules(MIN_PLOT_IN, MAX_PLOT_IN);

  // Keep the inputs in sync when the plot is resized by dragging the canvas.
  useEffect(() => {
    form.setFieldsValue(plot);
  }, [form, plot]);

  const handleFinish = (values: PlotSize) => {
    if (!setPlotSize(values)) {
      message.error(t("messages.plot_too_small"));
      return;
    }
    message.success(
      t("messages.plot_updated", {
        width: formatLength(values.width),
        length: formatLength(values.length),
      }),
    );
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={plot}
      onFinish={handleFinish}
      requiredMark={false}
    >
      <p className="mb-3 text-xs text-slate-500">{t("sidebar.plot_hint")}</p>
      <FormInput
        kind="dimension"
        name="width"
        label={t("width")}
        maxFeet={MAX_PLOT_IN / INCHES_PER_FOOT}
        rules={rules}
      />
      <FormInput
        kind="dimension"
        name="length"
        label={t("length")}
        maxFeet={MAX_PLOT_IN / INCHES_PER_FOOT}
        rules={rules}
      />
      <PrimaryButton
        variantType="default"
        htmlType="submit"
        icon={<ExpandOutlined />}
        block
      >
        {t("actions.apply_plot")}
      </PrimaryButton>
    </Form>
  );
}
