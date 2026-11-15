"use client";

import { Tag } from "antd";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import type { HouseTemplate } from "@/constants/houseTemplates";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import type { PlotSize } from "@/types/room";
import {
  buildTemplateRooms,
  isPortrait,
  templateFits,
  templateMinPlot,
} from "@/utils/templates";
import TemplatePreview from "./TemplatePreview";

export interface TemplateCardProps {
  template: HouseTemplate;
  plot: PlotSize;
  onUse: (template: HouseTemplate) => void;
}

export default function TemplateCard({
  template,
  plot,
  onUse,
}: TemplateCardProps) {
  const { t } = useTranslation();
  const { formatLength } = useLengthFormat();
  const fits = templateFits(template, plot);
  const min = templateMinPlot(template, plot);
  const rooms = buildTemplateRooms(template, plot);

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        fits
          ? "border-slate-200 bg-white"
          : "border-slate-200 bg-slate-50 opacity-70"
      }`}
    >
      <TemplatePreview rooms={rooms} plot={plot} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {t(`templates.items.${template.id}.name`)}
        </h3>
        <span className="shrink-0 text-xs text-slate-500">
          {t("templates.rooms_count", { count: rooms.length })}
        </span>
      </div>
      <p className="text-xs text-slate-600">
        {t(`templates.items.${template.id}.description`)}
      </p>
      <div className="flex flex-wrap gap-1">
        {fits ? (
          <Tag color="green">{t("templates.fits")}</Tag>
        ) : (
          <Tag color="orange">
            {t("templates.min_plot", {
              width: formatLength(min.width),
              length: formatLength(min.length),
            })}
          </Tag>
        )}
        {fits && isPortrait(plot) && (
          <Tag color="blue">{t("templates.rotated")}</Tag>
        )}
      </div>
      <PrimaryButton
        className="mt-auto"
        disabled={!fits}
        onClick={() => onUse(template)}
        block
      >
        {t("actions.use_template")}
      </PrimaryButton>
    </div>
  );
}
