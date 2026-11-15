"use client";

import { Form, App } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import FormInput from "@/components/common/FormInput";
import FormSelect from "@/components/common/FormSelect";
import PrimaryButton from "@/components/common/PrimaryButton";
import {
  DEFAULT_ROOM_SIZE,
  INCHES_PER_FOOT,
  MAX_ROOM_IN,
  MIN_ROOM_IN,
} from "@/constants/floorPlan";
import { useDimensionRules } from "@/hooks/useDimensionRules";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import { useRoomStore } from "@/store/useRoomStore";
import { ROOM_TYPES, type NewRoomInput, type RoomType } from "@/types/room";

const INITIAL: NewRoomInput = { type: "bedroom", ...DEFAULT_ROOM_SIZE.bedroom };

export default function RoomForm() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const roomLabel = useRoomLabel();
  const addRoom = useRoomStore((s) => s.addRoom);
  const [form] = Form.useForm<NewRoomInput>();
  const type = Form.useWatch("type", form) ?? INITIAL.type;
  const dimensionRules = useDimensionRules(MIN_ROOM_IN, MAX_ROOM_IN);

  const typeOptions = ROOM_TYPES.map((value) => ({
    value,
    label: t(`room_types.${value}`),
  }));

  const handleValuesChange = (changed: Partial<NewRoomInput>) => {
    if (changed.type)
      form.setFieldsValue(DEFAULT_ROOM_SIZE[changed.type as RoomType]);
  };

  const handleFinish = (values: NewRoomInput) => {
    const result = addRoom(values);
    if (!result.ok) {
      message.error(t("messages.no_space"));
      return;
    }
    message.success(t("messages.room_added", { name: roomLabel(result.room) }));
    if (values.type === "custom") form.setFieldValue("customName", undefined);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={INITIAL}
      onValuesChange={handleValuesChange}
      onFinish={handleFinish}
      requiredMark={false}
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
      <PrimaryButton htmlType="submit" icon={<PlusOutlined />} block>
        {t("actions.add_room")}
      </PrimaryButton>
    </Form>
  );
}
