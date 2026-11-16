"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ColorPicker, Segmented, Switch } from "antd";
import {
  AimOutlined,
  CaretRightOutlined,
  EyeOutlined,
  PauseOutlined,
  RedoOutlined,
  RotateRightOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/common/PrimaryButton";
import { INCHES_PER_FOOT } from "@/constants/floorPlan";
import { EXTERIOR_PRESETS } from "@/constants/view3d";
import { useRoomStore } from "@/store/useRoomStore";
import { buildFurniture, type Part } from "@/utils/furniture";
import { planTour } from "@/utils/walk";
import Scene3D, { type SceneMode } from "./Scene3D";
import WalkController, { createWalkInput } from "./WalkController";
import WalkOverlay from "./WalkOverlay";

/** Stable empty list, so switching furniture off doesn't rebuild things every render. */
const NO_FURNITURE: Part[] = [];

/**
 * Interactive 3D model of the current plan, built live from the same room data.
 * Three ways to look at it: orbit around the model, walk through it in first person,
 * or take a guided tour that walks through every room on its own.
 */
export default function FloorPlan3D() {
  const { t } = useTranslation();
  const plot = useRoomStore((s) => s.plot);
  const rooms = useRoomStore((s) => s.rooms);
  const exteriorColor = useRoomStore((s) => s.exteriorColor);
  const setExteriorColor = useRoomStore((s) => s.setExteriorColor);
  const [mode, setMode] = useState<SceneMode>("orbit");
  const [cutaway, setCutaway] = useState(false);
  const [showFurniture, setShowFurniture] = useState(true);
  const allFurniture = useMemo(() => buildFurniture(rooms), [rooms]);
  const furniture = showFurniture ? allFurniture : NO_FURNITURE;
  const [roomId, setRoomId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [tourDone, setTourDone] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  const controls = useRef<OrbitControlsImpl>(null);
  const inputRef = useRef(createWalkInput());

  const firstPerson = mode !== "orbit";
  const unreachable = useMemo(
    () => (mode === "tour" ? planTour(rooms, plot).unreachable : 0),
    // Only needed when a tour starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, tourRun, plot],
  );

  const span = Math.max(plot.width, plot.length) / INCHES_PER_FOOT;
  const camera = {
    position: [0, span * 0.75, span * 0.95] as [number, number, number],
    fov: 45,
  };

  const startTour = () => {
    setTourDone(false);
    setPlaying(true);
    setTourRun((n) => n + 1);
  };
  const changeMode = (next: SceneMode) => {
    if (next === "tour") startTour();
    setMode(next);
  };
  const onTourEnd = useCallback(() => {
    setTourDone(true);
    setPlaying(false);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<SceneMode>
            size="small"
            value={mode}
            onChange={changeMode}
            options={[
              {
                value: "orbit",
                label: t("tour.mode_orbit"),
                icon: <RotateRightOutlined />,
              },
              {
                value: "walk",
                label: t("tour.mode_walk"),
                icon: <UserOutlined />,
              },
              {
                value: "tour",
                label: t("tour.mode_tour"),
                icon: <EyeOutlined />,
              },
            ]}
          />
          {mode === "orbit" && (
            <Segmented
              size="small"
              value={cutaway ? "cutaway" : "full"}
              onChange={(v) => setCutaway(v === "cutaway")}
              options={[
                { value: "full", label: t("view3d.full_walls") },
                { value: "cutaway", label: t("view3d.cutaway") },
              ]}
            />
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <Switch
              size="small"
              checked={showFurniture}
              onChange={setShowFurniture}
            />
            {t("view3d.furniture")}
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <ColorPicker
              size="small"
              value={exteriorColor}
              disabledAlpha
              presets={[
                {
                  label: t("finishes.exterior_presets"),
                  colors: [...EXTERIOR_PRESETS],
                },
              ]}
              onChangeComplete={(c) => setExteriorColor(c.toHexString())}
            />
            {t("finishes.exterior")}
          </label>
        </div>

        {mode === "orbit" && (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 lg:inline">
              {t("view3d.hint")}
            </span>
            <PrimaryButton
              variantType="default"
              size="small"
              icon={<AimOutlined />}
              onClick={() => controls.current?.reset()}
            >
              {t("view3d.reset_camera")}
            </PrimaryButton>
          </div>
        )}
        {mode === "tour" && (
          <div className="flex flex-wrap items-center gap-2">
            {!tourDone && (
              <PrimaryButton
                variantType="default"
                size="small"
                icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? t("tour.pause") : t("tour.resume")}
              </PrimaryButton>
            )}
            <PrimaryButton
              variantType="default"
              size="small"
              icon={<RedoOutlined />}
              onClick={startTour}
            >
              {t("tour.restart")}
            </PrimaryButton>
            <PrimaryButton
              size="small"
              icon={<UserOutlined />}
              onClick={() => setMode("walk")}
            >
              {t("tour.walk_from_here")}
            </PrimaryButton>
          </div>
        )}
      </div>

      {mode === "tour" && (tourDone || unreachable > 0) && (
        <p className="text-xs text-slate-500">
          {tourDone && t("tour.finished")}{" "}
          {unreachable > 0 && t("tour.unreachable", { count: unreachable })}
        </p>
      )}

      <div className="relative h-[65vh] min-h-[420px] overflow-hidden rounded-xl border border-slate-200 shadow-inner">
        {/* Re-key on plot size (and orbit vs first person) so each starts with a fresh camera. */}
        <Canvas
          key={`${plot.width}x${plot.length}-${firstPerson ? "fp" : "orbit"}`}
          shadows
          camera={camera}
          dpr={[1, 2]}
        >
          <Scene3D
            ref={controls}
            cutaway={cutaway && !firstPerson}
            mode={mode}
            furniture={furniture}
          />
          {firstPerson && (
            <WalkController
              mode={mode}
              inputRef={inputRef}
              playing={playing}
              tourRun={tourRun}
              onRoomChange={setRoomId}
              onLockChange={setLocked}
              onTourEnd={onTourEnd}
              furniture={furniture}
            />
          )}
        </Canvas>
        {firstPerson && (
          <WalkOverlay
            mode={mode}
            inputRef={inputRef}
            roomId={roomId}
            locked={locked}
            furniture={furniture}
          />
        )}
      </div>
    </div>
  );
}
