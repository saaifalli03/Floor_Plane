"use client";

import AppHeader from "@/components/layout/AppHeader";
import MapCanvas from "./MapCanvas";
import SidebarController from "./SidebarController";

export default function FloorPlanWorkspace() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader />
      <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <SidebarController />
        <MapCanvas />
      </main>
    </div>
  );
}
