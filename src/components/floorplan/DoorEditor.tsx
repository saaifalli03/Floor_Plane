"use client";

import type { ReactNode } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { NO_OPENING_TYPES } from "@/constants/floorPlan";
import { useRoomStore } from "@/store/useRoomStore";
import DoorRow from "./DoorRow";
import WallItemRow from "./WallItemRow";

function Section({
  title,
  empty,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  empty: string | null;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      {empty && <p className="text-xs text-slate-500">{empty}</p>}
      {children}
      <PrimaryButton
        variantType="dashed"
        icon={<PlusOutlined />}
        onClick={onAdd}
        block
      >
        {addLabel}
      </PrimaryButton>
    </section>
  );
}

/** Doors, windows and vents of the currently selected room. */
export default function DoorEditor() {
  const { t } = useTranslation();
  const room = useRoomStore((s) => s.rooms.find((r) => r.id === s.selectedId));
  const {
    addDoor,
    addWindow,
    addVent,
    updateWindow,
    removeWindow,
    updateVent,
    removeVent,
  } = useRoomStore.getState();

  if (!room)
    return <p className="text-xs text-slate-500">{t("doors.select_hint")}</p>;

  const doors = room.doors ?? [];
  const windows = room.windows ?? [];
  const vents = room.vents ?? [];
  const sealed = NO_OPENING_TYPES.includes(room.type);

  return (
    <div className="flex flex-col gap-3">
      {!sealed && (
        <>
          <Section
            title={t("doors.title")}
            empty={doors.length === 0 ? t("doors.empty") : null}
            addLabel={t("actions.add_door")}
            onAdd={() => addDoor(room.id)}
          >
            {doors.map((door, i) => (
              <DoorRow key={door.id} room={room} door={door} index={i} />
            ))}
          </Section>

          <Section
            title={t("windows.title")}
            empty={windows.length === 0 ? t("windows.empty") : null}
            addLabel={t("actions.add_window")}
            onAdd={() => addWindow(room.id)}
          >
            {windows.map((win, i) => (
              <WallItemRow
                key={win.id}
                room={room}
                item={win}
                title={t("windows.window_n", { n: i + 1 })}
                positionLabel={t("windows.position")}
                widthLabel={t("windows.width")}
                removeLabel={t("actions.remove_window")}
                borderClass="border-sky-200"
                onUpdate={(patch) => updateWindow(room.id, win.id, patch)}
                onRemove={() => removeWindow(room.id, win.id)}
              />
            ))}
          </Section>
        </>
      )}

      <Section
        title={t("vents.title")}
        empty={vents.length === 0 ? t("vents.empty") : null}
        addLabel={t("actions.add_vent")}
        onAdd={() => addVent(room.id)}
      >
        {vents.map((vent, i) => (
          <WallItemRow
            key={vent.id}
            room={room}
            item={vent}
            title={t("vents.vent_n", { n: i + 1 })}
            positionLabel={t("vents.position")}
            widthLabel={t("vents.width")}
            removeLabel={t("actions.remove_vent")}
            borderClass="border-cyan-300"
            onUpdate={(patch) => updateVent(room.id, vent.id, patch)}
            onRemove={() => removeVent(room.id, vent.id)}
          />
        ))}
      </Section>

      {(doors.length > 0 || windows.length > 0 || vents.length > 0) && (
        <p className="text-xs text-slate-500">{t("doors.drag_hint")}</p>
      )}
    </div>
  );
}
