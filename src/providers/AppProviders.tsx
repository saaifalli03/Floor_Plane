"use client";

import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntApp, ConfigProvider } from "antd";
import i18n from "@/i18n/config";

const theme = {
  token: {
    colorPrimary: "#4f46e5",
    borderRadius: 8,
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
};

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <AntdRegistry>
        <ConfigProvider theme={theme}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </AntdRegistry>
    </I18nextProvider>
  );
}
