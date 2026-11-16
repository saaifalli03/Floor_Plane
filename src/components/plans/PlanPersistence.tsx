"use client";

import { useEffect } from "react";
import { usePlansStore } from "@/store/usePlansStore";
import { useRoomStore } from "@/store/useRoomStore";

/**
 * Loads the autosaved plan and the saved-plans list from browser storage once the
 * page is running (after the first render, so server and browser HTML match).
 */
export default function PlanPersistence() {
  useEffect(() => {
    void useRoomStore.persist.rehydrate();
    void usePlansStore.persist.rehydrate();
  }, []);
  return null;
}
