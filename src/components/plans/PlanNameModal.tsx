"use client";

import { Form, Input, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { MAX_PLAN_NAME } from "@/utils/planFile";

export interface PlanNameModalProps {
  open: boolean;
  title: string;
  okText: string;
  initialName: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

/** Asks for a plan's name (Save as, Rename). */
export default function PlanNameModal({
  open,
  title,
  okText,
  initialName,
  onSubmit,
  onClose,
}: PlanNameModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string }>();

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText={t("actions.cancel")}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (visible) form.setFieldsValue({ name: initialName });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ name: initialName }}
        onFinish={({ name }) => {
          onSubmit(name.trim());
          onClose();
        }}
      >
        <Form.Item
          name="name"
          label={t("plans.name_label")}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t("plans.name_required"),
            },
          ]}
        >
          <Input
            autoFocus
            maxLength={MAX_PLAN_NAME}
            placeholder={t("plans.name_placeholder")}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
