"use client";

import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import PlanPersistence from "@/components/plans/PlanPersistence";
import CanvasArea from "./CanvasArea";
import SidebarController from "./SidebarController";

export default function FloorPlanWorkspace() {
  return (
    // On large screens the page fits the window: the sidebar and the canvas scroll on
    // their own, the header and footer stay put. On small screens the page scrolls.
    <div className="flex min-h-screen flex-col bg-slate-50 lg:h-screen lg:overflow-hidden">
      <PlanPersistence />
      <AppHeader />
      <main className="flex flex-1 flex-col gap-4 p-4 lg:min-h-0 lg:flex-row lg:p-6">
        <SidebarController />
        <CanvasArea />
      </main>
      <AppFooter />
    </div>
  );
}
