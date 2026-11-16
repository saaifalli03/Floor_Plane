"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "@/utils/id";
import { MAX_PLAN_NAME, sanitizePlan, type PlanData } from "@/utils/planFile";
import { browserStorage, STORAGE_KEYS } from "./browserStorage";

export interface SavedPlan {
  id: string;
  name: string;
  /** ISO date-time of the last save. */
  savedAt: string;
  plan: PlanData;
}

interface PlansState {
  plans: SavedPlan[];
  /** Save a new entry; returns its id. */
  add: (name: string, plan: PlanData) => string;
  /** Overwrite an entry's plan. Returns false if it no longer exists. */
  update: (id: string, plan: PlanData) => boolean;
  rename: (id: string, name: string) => void;
  /** Copy an entry under a new name; returns the copy's id. */
  duplicate: (id: string, name: string) => string | null;
  remove: (id: string) => void;
}

const cleanName = (name: string) => name.trim().slice(0, MAX_PLAN_NAME);
const now = () => new Date().toISOString();
/** Deep copy, so a saved plan never shares objects with the one being edited. */
const copy = (plan: PlanData): PlanData => structuredClone(plan);

/** Named plans kept in this browser ("My plans"). Newest first. */
export const usePlansStore = create<PlansState>()(
  persist(
    (set, get) => ({
      plans: [],
      add: (name, plan) => {
        const id = createId();
        set((s) => ({
          plans: [
            { id, name: cleanName(name), savedAt: now(), plan: copy(plan) },
            ...s.plans,
          ],
        }));
        return id;
      },
      update: (id, plan) => {
        if (!get().plans.some((p) => p.id === id)) return false;
        set((s) => ({
          plans: [
            ...s.plans
              .filter((p) => p.id === id)
              .map((p) => ({ ...p, savedAt: now(), plan: copy(plan) })),
            ...s.plans.filter((p) => p.id !== id),
          ],
        }));
        return true;
      },
      rename: (id, name) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, name: cleanName(name) } : p,
          ),
        })),
      duplicate: (id, name) => {
        const original = get().plans.find((p) => p.id === id);
        return original ? get().add(name, original.plan) : null;
      },
      remove: (id) =>
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
    }),
    {
      name: STORAGE_KEYS.saved,
      version: 1,
      storage: browserStorage,
      skipHydration: true,
      // Check every stored plan; drop any that are damaged.
      merge: (persisted, current) => {
        const raw = (persisted as { plans?: unknown } | undefined)?.plans;
        if (!Array.isArray(raw)) return current;
        const plans: SavedPlan[] = [];
        for (const entry of raw) {
          if (typeof entry !== "object" || entry === null) continue;
          const e = entry as Record<string, unknown>;
          const plan = sanitizePlan(e.plan);
          if (!plan || typeof e.id !== "string") continue;
          plans.push({
            id: e.id,
            name: typeof e.name === "string" ? cleanName(e.name) : "",
            savedAt: typeof e.savedAt === "string" ? e.savedAt : now(),
            plan,
          });
        }
        return { ...current, plans };
      },
    },
  ),
);
