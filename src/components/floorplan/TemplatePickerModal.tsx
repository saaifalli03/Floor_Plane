"use client";

import { App, Modal } from "antd";
import { useTranslation } from "react-i18next";
import {
  HOUSE_TEMPLATES,
  type HouseTemplate,
} from "@/constants/houseTemplates";
import { useLengthFormat } from "@/hooks/useLengthFormat";
import { useRoomStore } from "@/store/useRoomStore";
import { buildTemplateRooms, templateFits } from "@/utils/templates";
import TemplateCard from "./TemplateCard";

export interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TemplatePickerModal({
  open,
  onClose,
}: TemplatePickerModalProps) {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const { formatLength } = useLengthFormat();
  const plot = useRoomStore((s) => s.plot);
  const roomCount = useRoomStore((s) => s.rooms.length);
  const replaceRooms = useRoomStore((s) => s.replaceRooms);
  const autoPlaceDoors = useRoomStore((s) => s.autoPlaceDoors);
  const autoPlaceWindows = useRoomStore((s) => s.autoPlaceWindows);
  const autoPlaceVents = useRoomStore((s) => s.autoPlaceVents);

  const apply = (template: HouseTemplate) => {
    if (!templateFits(template, plot)) {
      message.error(t("messages.template_too_small"));
      return;
    }
    replaceRooms(buildTemplateRooms(template, plot));
    autoPlaceDoors();
    autoPlaceWindows();
    autoPlaceVents();
    message.success(
      t("messages.template_applied", {
        name: t(`templates.items.${template.id}.name`),
      }),
    );
    onClose();
  };

  const handleUse = (template: HouseTemplate) => {
    if (roomCount === 0) {
      apply(template);
      return;
    }
    modal.confirm({
      title: t("templates.replace_title"),
      content: t("templates.replace_body", { count: roomCount }),
      okText: t("actions.replace"),
      cancelText: t("actions.cancel"),
      okButtonProps: { danger: true },
      onOk: () => apply(template),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={880}
      title={t("templates.modal_title", {
        width: formatLength(plot.width),
        length: formatLength(plot.length),
      })}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {HOUSE_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            plot={plot}
            onUse={handleUse}
          />
        ))}
      </div>
    </Modal>
  );
}
