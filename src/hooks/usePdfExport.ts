"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { App } from "antd";
import { CANVAS_ELEMENT_ID } from "@/constants/floorPlan";
import { useRoomStore } from "@/store/useRoomStore";
import { exportElementToPdf } from "@/utils/exportPdf";
import { useLengthFormat } from "./useLengthFormat";

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

export function usePdfExport() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const { formatLength } = useLengthFormat();
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    const { rooms, plot, selectRoom } = useRoomStore.getState();
    if (rooms.length === 0) {
      message.warning(t("messages.export_empty"));
      return;
    }
    const element = document.getElementById(CANVAS_ELEMENT_ID);
    if (!element) return;

    setExporting(true);
    selectRoom(null); // hide selection chrome in the capture
    await nextFrame();
    try {
      const date = new Date().toLocaleString(i18n.language);
      await exportElementToPdf(element, {
        title: t("pdf.title"),
        subtitle: t("pdf.subtitle", {
          width: formatLength(plot.width),
          length: formatLength(plot.length),
          date,
        }),
        fileName: t("pdf.file_name"),
      });
      message.success(t("messages.export_success"));
    } catch (err) {
      console.error(err);
      message.error(t("messages.export_error"));
    } finally {
      setExporting(false);
    }
  }, [formatLength, i18n.language, message, t]);

  return { exportPdf, exporting };
}
