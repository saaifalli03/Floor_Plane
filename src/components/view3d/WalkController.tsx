"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { INCHES_PER_FOOT } from "@/constants/floorPlan";
import { TOUR, WALK } from "@/constants/view3d";
import { useRoomStore } from "@/store/useRoomStore";
import type { Part } from "@/utils/furniture";
import {
  buildWalkWorld,
  floorHeightAt,
  moveWalker,
  planTour,
  roomAt,
  yawFor,
  type Point,
} from "@/utils/walk";

/** Movement buttons held down on the on-screen pad (shared with the overlay). */
export interface WalkInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  /** Set by "go to room"; consumed by the controller. */
  teleport: Point | null;
}

export const createWalkInput = (): WalkInput => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  teleport: null,
});

export interface WalkControllerProps {
  mode: "walk" | "tour";
  inputRef: RefObject<WalkInput>;
  /** Tour only: whether it is moving. */
  playing: boolean;
  /** Changing this restarts the tour from the front door. */
  tourRun: number;
  onRoomChange: (roomId: string | null) => void;
  onLockChange: (locked: boolean) => void;
  onTourEnd: () => void;
  /** Furniture in the way (empty when switched off). */
  furniture: Part[];
}

const KEYS: Record<string, keyof Omit<WalkInput, "teleport"> | "run"> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Shortest signed angle from a to b. */
const angleTo = (a: number, b: number) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * First-person camera for the walk-through and the guided tour. Walking: mouse or
 * touch to look, WASD / arrows / on-screen pad to move, with walls in the way and
 * stairs you can climb. Tour: follows a route through every room on its own.
 */
export default function WalkController({
  mode,
  inputRef,
  playing,
  tourRun,
  onRoomChange,
  onLockChange,
  onTourEnd,
  furniture,
}: WalkControllerProps) {
  const get = useThree((s) => s.get);
  const plot = useRoomStore((s) => s.plot);
  const rooms = useRoomStore((s) => s.rooms);

  const world = useMemo(
    () => buildWalkWorld(rooms, plot, furniture),
    [rooms, plot, furniture],
  );
  // The route is planned when the tour (re)starts, not on every edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tour = useMemo(() => planTour(rooms, plot, furniture), [tourRun, plot]);

  // Walker state lives in refs: it changes every frame and must not re-render React.
  const pos = useRef<Point>({ ...tour.start.at });
  const yaw = useRef(tour.start.yaw);
  const pitch = useRef(0);
  const eyeZ = useRef(0);
  const keys = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
  });
  const tourState = useRef({ index: 0, along: 0, dwell: 0, done: false });
  const lastRoom = useRef<string | null | undefined>(undefined);

  // Camera set-up for first person.
  useEffect(() => {
    const camera = get().camera as PerspectiveCamera;
    camera.fov = WALK.fov;
    camera.near = 0.1;
    camera.rotation.order = "YXZ";
    camera.updateProjectionMatrix();
  }, [get]);

  // (Re)start the tour from the front door.
  useEffect(() => {
    if (mode !== "tour") return;
    pos.current = { ...tour.start.at };
    yaw.current = tour.start.yaw;
    pitch.current = 0;
    tourState.current = {
      index: 0,
      along: 0,
      dwell: 0,
      done: tour.path.length < 2,
    };
    if (tour.path.length < 2) onTourEnd();
  }, [mode, tour, onTourEnd]);

  // Keyboard.
  useEffect(() => {
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const action = KEYS[e.code];
      if (!action || isTyping(e.target)) return;
      if (e.code.startsWith("Arrow")) e.preventDefault(); // don't scroll the page
      keys.current[action] = down;
    };
    const down = onKey(true);
    const up = onKey(false);
    const clear = () =>
      (keys.current = {
        forward: false,
        back: false,
        left: false,
        right: false,
        run: false,
      });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  // Looking around: pointer lock with a mouse, drag to look with touch (or if lock fails).
  useEffect(() => {
    const el = get().gl.domElement;
    const drag: { current: { id: number; x: number; y: number } | null } = {
      current: null,
    };
    const look = (dx: number, dy: number) => {
      yaw.current -= dx * WALK.lookSensitivity;
      pitch.current = Math.max(
        -WALK.maxPitch,
        Math.min(WALK.maxPitch, pitch.current - dy * WALK.lookSensitivity),
      );
    };
    const locked = () => document.pointerLockElement === el;
    const onDown = (e: PointerEvent) => {
      if (mode !== "walk") return;
      if (e.pointerType === "mouse" && !locked()) {
        try {
          const req = el.requestPointerLock() as unknown as
            Promise<void> | undefined;
          req?.catch?.(() => undefined);
        } catch {
          /* fall back to drag-to-look */
        }
      }
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (mode !== "walk") return;
      if (locked()) return look(e.movementX, e.movementY);
      if (drag.current?.id !== e.pointerId) return;
      look(e.clientX - drag.current.x, e.clientY - drag.current.y);
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (drag.current?.id === e.pointerId) drag.current = null;
    };
    const onLock = () => onLockChange(locked());
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.addEventListener("pointerlockchange", onLock);
    el.style.touchAction = "none";
    el.style.cursor = mode === "walk" ? "grab" : "default";
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerlockchange", onLock);
      if (locked()) document.exitPointerLock();
      el.style.cursor = "";
    };
  }, [get, mode, onLockChange]);

  // Leaving walk mode releases the mouse.
  useEffect(() => {
    if (mode !== "walk" && document.pointerLockElement)
      document.exitPointerLock();
  }, [mode]);

  useFrame((state, rawDt) => {
    const { camera } = state;
    const pad = inputRef.current;
    const dt = Math.min(rawDt, 0.1);

    if (pad.teleport) {
      pos.current = pad.teleport;
      pad.teleport = null;
    }

    if (mode === "walk") {
      const k = keys.current;
      const fwd = Number(k.forward || pad.forward) - Number(k.back || pad.back);
      const side = Number(k.right || pad.right) - Number(k.left || pad.left);
      if (fwd || side) {
        const len = Math.hypot(fwd, side);
        const speed = WALK.speed * (k.run ? WALK.runMultiplier : 1) * dt;
        const s = Math.sin(yaw.current);
        const c = Math.cos(yaw.current);
        // Forward is (-sin, -cos) on the plan; right is (cos, -sin).
        const dx = ((-s * fwd + c * side) / len) * speed;
        const dy = ((-c * fwd - s * side) / len) * speed;
        pos.current = moveWalker(world, pos.current, dx, dy);
      }
    } else {
      const st = tourState.current;
      const path = tour.path;
      if (playing && !st.done) {
        if (st.dwell > 0) {
          st.dwell -= dt;
        } else {
          let travel = TOUR.speed * dt;
          while (travel > 0 && st.index < path.length - 1) {
            const a = path[st.index];
            const b = path[st.index + 1];
            const segLen = Math.hypot(b.x - a.x, b.y - a.y);
            if (st.along + travel < segLen) {
              st.along += travel;
              travel = 0;
            } else {
              travel -= segLen - st.along;
              st.index += 1;
              st.along = 0;
              if (path[st.index].roomId) {
                st.dwell = TOUR.dwell;
                break;
              }
            }
          }
          if (st.index >= path.length - 1) {
            st.done = true;
            onTourEnd();
          }
        }
        const a = path[st.index];
        const b = path[Math.min(st.index + 1, path.length - 1)];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const f = st.along / segLen;
        pos.current = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
        // Face where we're heading (during a pause, turn towards the next leg).
        if (b !== a && (b.x !== a.x || b.y !== a.y)) {
          const target = yawFor(b.x - a.x, b.y - a.y);
          const turn = angleTo(yaw.current, target);
          const maxTurn = TOUR.turnRate * dt;
          yaw.current += Math.max(-maxTurn, Math.min(maxTurn, turn));
        }
        pitch.current += (0 - pitch.current) * Math.min(1, dt * 3);
      }
    }

    // Smoothly follow the floor height so stairs feel like stairs.
    const floor = floorHeightAt(world, pos.current);
    eyeZ.current +=
      (floor - eyeZ.current) * Math.min(1, dt * WALK.heightFollow);

    const ft = (inches: number) => inches / INCHES_PER_FOOT;
    camera.position.set(
      ft(pos.current.x - plot.width / 2),
      ft(eyeZ.current + WALK.eyeHeight),
      ft(pos.current.y - plot.length / 2),
    );
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    const here = roomAt(rooms, pos.current)?.id ?? null;
    if (here !== lastRoom.current) {
      lastRoom.current = here;
      onRoomChange(here);
    }
  });

  return null;
}
