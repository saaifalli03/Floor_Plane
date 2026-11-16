"use client";

import { App, Form } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import FormInput from "@/components/common/FormInput";
import FormSelect from "@/components/common/FormSelect";
import PrimaryButton from "@/components/common/PrimaryButton";
import {
  INCHES_PER_FOOT,
  MAX_ROOM_IN,
  MIN_ROOM_IN,
} from "@/constants/floorPlan";
import { useDimensionRules } from "@/hooks/useDimensionRules";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import { useRoomStore } from "@/store/useRoomStore";
import { ROOM_TYPES, type Room, type RoomType } from "@/types/room";
import RoomFinishes from "./RoomFinishes";
import RoomFurniture from "./RoomFurniture";
import RoomStructure from "./RoomStructure";

interface EditValues {
  type: RoomType;
  customName?: string;
  width: number;
  length: number;
}

function RoomEditForm({ room }: { room: Room }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const roomLabel = useRoomLabel();
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const [form] = Form.useForm<EditValues>();
  const type = Form.useWatch("type", form) ?? room.type;
  const dimensionRules = useDimensionRules(MIN_ROOM_IN, MAX_ROOM_IN);
  const typeOptions = ROOM_TYPES.map((value) => ({
    value,
    label: t(`room_types.${value}`),
  }));

  const handleFinish = (values: EditValues) => {
    if (!updateRoom(room.id, values)) {
      message.error(t("messages.room_update_blocked"));
      return;
    }
    message.success(t("messages.room_updated", { name: roomLabel(values) }));
  };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={{
        type: room.type,
        customName: room.customName,
        width: room.width,
        length: room.length,
      }}
      onFinish={handleFinish}
    >
      <FormSelect name="type" label={t("room_type")} options={typeOptions} />
      <FormInput
        name="customName"
        label={t("room_name")}
        placeholder={t("room_name_placeholder")}
        maxLength={24}
        hidden={type !== "custom"}
        rules={
          type === "custom"
            ? [{ required: true, message: t("validation.required") }]
            : []
        }
      />
      <FormInput
        kind="dimension"
        name="width"
        label={t("width")}
        maxFeet={MAX_ROOM_IN / INCHES_PER_FOOT}
        rules={dimensionRules}
      />
      <FormInput
        kind="dimension"
        name="length"
        label={t("length")}
        maxFeet={MAX_ROOM_IN / INCHES_PER_FOOT}
        rules={dimensionRules}
      />
      <PrimaryButton htmlType="submit" icon={<SaveOutlined />} block>
        {t("actions.save_changes")}
      </PrimaryButton>
    </Form>
  );
}

/** Edit the selected room's type, name, size, wall paint and floor. */
export default function RoomEditor() {
  const { t } = useTranslation();
  const room = useRoomStore((s) => s.rooms.find((r) => r.id === s.selectedId));
  if (!room)
    return (
      <p className="text-xs text-slate-500">{t("edit_room.select_hint")}</p>
    );
  // Re-mount when the room changes elsewhere (e.g. resized on the canvas) so the form shows it.
  return (
    <>
      <RoomEditForm
        key={`${room.id}-${room.type}-${room.customName}-${room.width}-${room.length}`}
        room={room}
      />
      <RoomStructure room={room} />
      <RoomFinishes room={room} />
      <RoomFurniture room={room} />
    </>
  );
}
