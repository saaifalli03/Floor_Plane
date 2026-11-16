"use client";

import { useCallback, useMemo } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";
import { usePlansStore, type SavedPlan } from "@/store/usePlansStore";
import { useRoomStore } from "@/store/useRoomStore";
import {
  parsePlanFile,
  planFileName,
  planFingerprint,
  sanitizePlan,
  toPlanFile,
  type PlanData,
} from "@/utils/planFile";

export type PlanStatus = "empty" | "unsaved" | "saved";

const currentPlan = (): PlanData => {
  const s = useRoomStore.getState();
  return { plot: s.plot, rooms: s.rooms, exteriorColor: s.exteriorColor };
};

/** Whether the plan being edited matches its saved copy. */
export function usePlanStatus(): { name: string | null; status: PlanStatus } {
  const plot = useRoomStore((s) => s.plot);
  const rooms = useRoomStore((s) => s.rooms);
  const exteriorColor = useRoomStore((s) => s.exteriorColor);
  const id = useRoomStore((s) => s.currentPlanId);
  const name = useRoomStore((s) => s.currentPlanName);
  const saved = usePlansStore((s) => s.plans.find((p) => p.id === id));

  const status = useMemo<PlanStatus>(() => {
    if (saved)
      return planFingerprint(saved.plan) ===
        planFingerprint({ plot, rooms, exteriorColor })
        ? "saved"
        : "unsaved";
    return rooms.length ? "unsaved" : "empty";
  }, [saved, plot, rooms, exteriorColor]);

  return { name, status };
}

/** Saving, opening, importing and exporting plans, with confirmations and messages. */
export function usePlanActions() {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const { status } = usePlanStatus();
  const loadPlan = useRoomStore((s) => s.loadPlan);
  const setCurrentPlan = useRoomStore((s) => s.setCurrentPlan);
  const resetPlan = useRoomStore((s) => s.newPlan);
  const plansApi = usePlansStore();

  /** Run `action`, first asking before throwing away unsaved changes. */
  const confirmDiscard = useCallback(
    (action: () => void) => {
      if (status !== "unsaved") return action();
      modal.confirm({
        title: t("plans.unsaved_title"),
        content: t("plans.unsaved_body"),
        okText: t("plans.discard"),
        okButtonProps: { danger: true },
        cancelText: t("actions.cancel"),
        onOk: action,
      });
    },
    [status, modal, t],
  );

  /** Save over the current saved plan. Returns false when it needs a name first. */
  const save = useCallback(() => {
    const { currentPlanId, currentPlanName } = useRoomStore.getState();
    if (!currentPlanId || !plansApi.update(currentPlanId, currentPlan()))
      return false;
    message.success(t("plans.saved_msg", { name: currentPlanName ?? "" }));
    return true;
  }, [plansApi, message, t]);

  const saveAs = useCallback(
    (name: string) => {
      const id = plansApi.add(name, currentPlan());
      setCurrentPlan(id, name.trim());
      message.success(t("plans.saved_msg", { name: name.trim() }));
    },
    [plansApi, setCurrentPlan, message, t],
  );

  const open = useCallback(
    (saved: SavedPlan) =>
      confirmDiscard(() => {
        const plan = sanitizePlan(saved.plan);
        if (!plan) return void message.error(t("plans.errors.invalid"));
        loadPlan(plan, { id: saved.id, name: saved.name });
        message.success(t("plans.opened", { name: saved.name }));
      }),
    [confirmDiscard, loadPlan, message, t],
  );

  const newPlan = useCallback(
    () => confirmDiscard(resetPlan),
    [confirmDiscard, resetPlan],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      plansApi.rename(id, name);
      if (useRoomStore.getState().currentPlanId === id)
        setCurrentPlan(id, name.trim());
    },
    [plansApi, setCurrentPlan],
  );

  const duplicate = useCallback(
    (saved: SavedPlan) => {
      plansApi.duplicate(saved.id, t("plans.copy_name", { name: saved.name }));
    },
    [plansApi, t],
  );

  const remove = useCallback(
    (saved: SavedPlan) => {
      plansApi.remove(saved.id);
      // Keep working on it if it's open; it just isn't saved any more.
      if (useRoomStore.getState().currentPlanId === saved.id)
        setCurrentPlan(null, null);
      message.success(t("plans.deleted", { name: saved.name }));
    },
    [plansApi, setCurrentPlan, message, t],
  );

  /** Download a plan (the current one by default) as a file. */
  const download = useCallback(
    (name?: string, plan?: PlanData) => {
      const planName =
        name ?? useRoomStore.getState().currentPlanName ?? t("plans.untitled");
      const file = planFileName(planName, t("plans.untitled"));
      const blob = new Blob([toPlanFile(planName, plan ?? currentPlan())], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.success(t("plans.downloaded", { file }));
    },
    [message, t],
  );

  /** Open a plan file chosen by the user. It opens as a new, unsaved plan. */
  const importFile = useCallback(
    async (file: File) => {
      let text: string;
      try {
        text = await file.text();
      } catch {
        return void message.error(t("plans.errors.read_failed"));
      }
      const result = parsePlanFile(text);
      if (!result.ok)
        return void message.error(t(`plans.errors.${result.error}`));
      const name =
        result.name || file.name.replace(/(\.floorplan)?\.json$/i, "");
      confirmDiscard(() => {
        loadPlan(result.plan, { id: null, name });
        message.success(t("plans.imported", { name }));
      });
    },
    [confirmDiscard, loadPlan, message, t],
  );

  return {
    save,
    saveAs,
    open,
    newPlan,
    rename,
    duplicate,
    remove,
    download,
    importFile,
  };
}
