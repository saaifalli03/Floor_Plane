"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { splitFeetInches } from "@/utils/geometry";

/** Formatters for inch values → 12′ 6″ style strings. */
export function useLengthFormat() {
  const { t } = useTranslation();

  const formatLength = useCallback(
    (totalInches: number) => {
      const { feet, inches } = splitFeetInches(totalInches);
      if (feet === 0) return t("inches_only_value", { inches });
      if (inches === 0) return t("feet_only_value", { feet });
      return t("feet_inches_value", { feet, inches });
    },
    [t],
  );

  const formatDimensions = useCallback(
    (width: number, length: number) =>
      t("dimensions_value", { width: formatLength(width), length: formatLength(length) }),
    [formatLength, t],
  );

  return { formatLength, formatDimensions };
}
