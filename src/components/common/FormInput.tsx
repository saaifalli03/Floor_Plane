"use client";

import { Form, Input, type FormItemProps } from "antd";
import FeetInchesInput from "./FeetInchesInput";

type BaseProps = Pick<FormItemProps, "name" | "label" | "rules" | "className" | "hidden">;

type DimensionProps = BaseProps & {
  kind: "dimension";
  maxFeet?: number;
};

type TextProps = BaseProps & {
  kind?: "text";
  placeholder?: string;
  maxLength?: number;
};

export type FormInputProps = DimensionProps | TextProps;

/** Labelled antd form field: free text, or a length in feet + inches. */
export default function FormInput(props: FormInputProps) {
  const { name, label, rules, className, hidden } = props;
  return (
    <Form.Item name={name} label={label} rules={rules} className={className} hidden={hidden}>
      {props.kind === "dimension" ? (
        <FeetInchesInput maxFeet={props.maxFeet} />
      ) : (
        <Input placeholder={props.placeholder} maxLength={props.maxLength} allowClear />
      )}
    </Form.Item>
  );
}
