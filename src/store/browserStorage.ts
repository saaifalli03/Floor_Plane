import { create } from "zustand";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

/** Whether the browser is refusing to store plans (storage full, or blocked). */
export const useStorageStatus = create<{ failed: boolean }>()(() => ({
  failed: false,
}));

/**
 * localStorage that never throws: in a private window, with storage blocked or full,
 * reads come back empty and failed writes are flagged instead of breaking the app.
 */
const safeLocalStorage: StateStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
      if (useStorageStatus.getState().failed)
        useStorageStatus.setState({ failed: false });
    } catch {
      useStorageStatus.setState({ failed: true });
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

export const browserStorage = createJSONStorage(() => safeLocalStorage);

export const STORAGE_KEYS = {
  current: "floor-plan-studio:current-plan",
  saved: "floor-plan-studio:saved-plans",
} as const;
