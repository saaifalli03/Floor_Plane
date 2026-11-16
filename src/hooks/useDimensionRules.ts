"use client";

import { useMemo } from "react";
import type { FormRule } from "antd";
import { useTranslation } from "react-i18next";
import { useLengthFormat } from "./useLengthFormat";

/** antd validation rules for an inch value bounded by [min, max]. */
export function useDimensionRules(min: number, max: number): FormRule[] {
  const { t } = useTranslation();
  const { formatLength } = useLengthFormat();
  return useMemo(
    () => [
      {
        validator: (_, value?: number) => {
          if (value == null)
            return Promise.reject(new Error(t("validation.required")));
          if (value < min)
            return Promise.reject(
              new Error(
                t("validation.min_dimension", { min: formatLength(min) }),
              ),
            );
          if (value > max)
            return Promise.reject(
              new Error(
                t("validation.max_dimension", { max: formatLength(max) }),
              ),
            );
          return Promise.resolve();
        },
      },
    ],
    [formatLength, max, min, t],
  );
}
