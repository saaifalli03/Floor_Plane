"use client";

import { useTranslation } from "react-i18next";

/** Page footer: app name, year and credit. */
export default function AppFooter() {
  const { t } = useTranslation();
  return (
    <footer
      className="flex flex-col items-center justify-between gap-1 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 sm:flex-row lg:px-6"
      data-html2canvas-ignore
    >
      <span>
        {t("footer.copyright", {
          year: new Date().getFullYear(),
          app: t("app.title"),
        })}
      </span>
      <span>
        {t("footer.developed_by")}{" "}
        <span className="font-semibold text-slate-700">
          {t("footer.developer")}
        </span>
      </span>
    </footer>
  );
}
