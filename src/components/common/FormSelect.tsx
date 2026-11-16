"use client";

import { Form, Select, type FormItemProps } from "antd";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps extends Pick<
  FormItemProps,
  "name" | "label" | "rules" | "className"
> {
  options: SelectOption[];
}

export default function FormSelect({
  name,
  label,
  rules,
  className,
  options,
}: FormSelectProps) {
  return (
    <Form.Item name={name} label={label} rules={rules} className={className}>
      <Select options={options} />
    </Form.Item>
  );
}
