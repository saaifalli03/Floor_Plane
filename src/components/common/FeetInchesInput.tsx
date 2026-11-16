"use client";

import { InputNumber, Space } from "antd";
import { useTranslation } from "react-i18next";
import { INCHES_PER_FOOT } from "@/constants/floorPlan";
import { splitFeetInches } from "@/utils/geometry";

export interface FeetInchesInputProps {
  /** Total length in inches (controlled by antd Form.Item). */
  value?: number;
  onChange?: (totalInches: number) => void;
  maxFeet?: number;
  id?: string;
}

/** Two linked number boxes (ft + in) that read and write a single inch value. */
export default function FeetInchesInput({
  value,
  onChange,
  maxFeet,
  id,
}: FeetInchesInputProps) {
  const { t } = useTranslation();
  const { feet, inches } = splitFeetInches(value ?? 0);

  const emit = (nextFeet: number | null, nextInches: number | null) =>
    onChange?.((nextFeet ?? 0) * INCHES_PER_FOOT + (nextInches ?? 0));

  return (
    <Space.Compact block>
      <InputNumber
        id={id}
        className="!w-3/5"
        min={0}
        max={maxFeet}
        precision={0}
        value={feet}
        suffix={t("unit_ft")}
        aria-label={t("unit_ft")}
        onChange={(f) => emit(f, inches)}
      />
      <InputNumber
        className="!w-2/5"
        min={0}
        max={INCHES_PER_FOOT - 1}
        precision={0}
        value={inches}
        suffix={t("unit_in")}
        aria-label={t("unit_in")}
        onChange={(i) => emit(feet, i)}
      />
    </Space.Compact>
  );
}
