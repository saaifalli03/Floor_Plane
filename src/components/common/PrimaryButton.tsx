"use client";

import { Button, type ButtonProps } from "antd";

export type PrimaryButtonProps = Omit<ButtonProps, "type"> & {
  variantType?: ButtonProps["type"];
};

/** App-wide button. Defaults to the primary style; pass `variantType` for others. */
export default function PrimaryButton({
  variantType = "primary",
  className = "",
  ...rest
}: PrimaryButtonProps) {
  return <Button type={variantType} className={`font-medium ${className}`} {...rest} />;
}
