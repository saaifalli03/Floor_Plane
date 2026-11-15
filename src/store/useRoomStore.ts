"use client";

import { create } from "zustand";
import {
  DEFAULT_PLOT,
  DOOR,
  NO_OPENING_TYPES,
  VENT,
  WINDOW,
} from "@/constants/floorPlan";
import type {
  Door,
  NewRoomInput,
  PlotSize,
  Rect,
  Room,
  RoomType,
  RoomVent,
  RoomWindow,
  Wall,
} from "@/types/room";
import {
  autoPlaceDoors,
  defaultDoorFor,
  doorOnWall,
  moveWallItemToPoint,
  normalizeDoor,
  normalizeWallItem,
  suggestDoorFor,
  transposeWallItems,
} from "@/utils/doors";
import {
  autoPlaceWindows,
  defaultWindowFor,
  pruneInteriorWindows,
  windowOnWall,
  windowsFor,
} from "@/utils/windows";
import { applyRect, isBigEnough } from "@/utils/rooms";
import { autoPlaceVents, ventOnWall, ventsFor } from "@/utils/vents";
import { createId } from "@/utils/id";
import {
  findFreePosition,
  isInsidePlot,
  isValidPlacement,
  planSwap,
  roomToRect,
} from "@/utils/geometry";

type ActionResult = { ok: true; room: Room } | { ok: false };

interface RoomState {
  plot: PlotSize;
  rooms: Room[];
  selectedId: string | null;
  /** Resize the plot. Rejected if any existing room would fall outside it. */
  setPlotSize: (plot: PlotSize) => boolean;
  addRoom: (input: NewRoomInput) => ActionResult;
  /** Move to an absolute position (inches). Rejected if it collides or leaves the plot. */
  moveRoom: (id: string, x: number, y: number) => boolean;
  rotateRoom: (id: string) => boolean;
  /** Give a room a new rectangle (inches). Rejected if too small, outside the plot or overlapping. */
  resizeRoom: (id: string, rect: Rect) => boolean;
  /** Change a room's type, name and/or size (resized from its top-left corner). */
  updateRoom: (
    id: string,
    patch: {
      type?: RoomType;
      customName?: string;
      width?: number;
      length?: number;
    },
  ) => boolean;
  /** Swap two rooms' positions. Returns false if they don't fit in each other's spot. */
  swapRooms: (aId: string, bId: string) => boolean;
  /** Replace every room at once (used by templates). */
  replaceRooms: (rooms: Omit<Room, "id">[]) => void;
  removeRoom: (id: string) => void;
  /** Add a door, centred on `wall` if given, otherwise on the longest wall. */
  addDoor: (roomId: string, wall?: Wall) => void;
  updateDoor: (
    roomId: string,
    doorId: string,
    patch: Partial<Omit<Door, "id">>,
  ) => void;
  /** Drag a door to a room-local point (inches); it snaps to the nearest wall. */
  moveDoorTo: (roomId: string, doorId: string, x: number, y: number) => void;
  removeDoor: (roomId: string, doorId: string) => void;
  /** Replace all doors with an automatically connected set. Returns how many were placed. */
  autoPlaceDoors: () => number;
  /** Add a window, centred on `wall` if given, otherwise on the longest wall. */
  addWindow: (roomId: string, wall?: Wall) => void;
  updateWindow: (
    roomId: string,
    windowId: string,
    patch: Partial<Omit<RoomWindow, "id">>,
  ) => void;
  moveWindowTo: (
    roomId: string,
    windowId: string,
    x: number,
    y: number,
  ) => void;
  removeWindow: (roomId: string, windowId: string) => void;
  /** Replace all windows with ones on each room's outside walls. Returns how many. */
  autoPlaceWindows: () => number;
  /** Add a vent, centred on `wall` if given, otherwise on the longest wall. */
  addVent: (roomId: string, wall?: Wall) => void;
  updateVent: (
    roomId: string,
    ventId: string,
    patch: Partial<Omit<RoomVent, "id">>,
  ) => void;
  moveVentTo: (roomId: string, ventId: string, x: number, y: number) => void;
  removeVent: (roomId: string, ventId: string) => void;
  /** Replace all vents with exhaust vents for bathrooms, kitchens and garages. Returns how many. */
  autoPlaceVents: () => number;
  selectRoom: (id: string | null) => void;
  clearRooms: () => void;
}

export const useRoomStore = create<RoomState>()((set, get) => ({
  plot: DEFAULT_PLOT,
  rooms: [],
  selectedId: null,

  setPlotSize: (plot) => {
    const next = {
      width: Math.round(plot.width),
      length: Math.round(plot.length),
    };
    if (!get().rooms.every((r) => isInsidePlot(roomToRect(r), next)))
      return false;
    set({ plot: next });
    return true;
  },

  addRoom: (input) => {
    const { rooms, plot } = get();
    const width = Math.round(input.width);
    const length = Math.round(input.length);
    const spot = findFreePosition(width, length, rooms, plot);
    if (!spot) return { ok: false };
    const room: Room = {
      id: createId(),
      type: input.type,
      customName:
        input.type === "custom" ? input.customName?.trim() : undefined,
      width,
      length,
      x_position: spot.x,
      y_position: spot.y,
    };
    const sealed = NO_OPENING_TYPES.includes(room.type);
    room.doors =
      room.type === "garden" || sealed ? [] : [suggestDoorFor(room, rooms)];
    room.windows = windowsFor(room, rooms, room.doors);
    room.vents = ventsFor(room, rooms);
    set({ rooms: pruneInteriorWindows([...rooms, room]), selectedId: room.id });
    return { ok: true, room };
  },

  moveRoom: (id, x, y) => {
    const { rooms, plot } = get();
    const room = rooms.find((r) => r.id === id);
    if (!room) return false;
    const next = {
      x: Math.round(x),
      y: Math.round(y),
      width: room.width,
      length: room.length,
    };
    if (!isValidPlacement(next, rooms, plot, id)) return false;
    set({
      rooms: pruneInteriorWindows(
        rooms.map((r) =>
          r.id === id ? { ...r, x_position: next.x, y_position: next.y } : r,
        ),
      ),
    });
    return true;
  },

  swapRooms: (aId, bId) => {
    const { rooms, plot } = get();
    const a = rooms.find((r) => r.id === aId);
    const b = rooms.find((r) => r.id === bId);
    if (!a || !b) return false;
    const plan = planSwap(a, b, rooms, plot);
    if (!plan) return false;
    // Same-sized rooms trade their doors too, so each slot keeps its connections
    // (e.g. a bedroom moved into a hallway-facing slot gets the hallway door).
    const sameSize = a.width === b.width && a.length === b.length;
    set({
      rooms: pruneInteriorWindows(
        rooms.map((r) => {
          if (r.id === a.id)
            return sameSize
              ? {
                  ...r,
                  x_position: plan.a.x,
                  y_position: plan.a.y,
                  doors: b.doors,
                  windows: b.windows,
                  vents: b.vents,
                }
              : { ...r, x_position: plan.a.x, y_position: plan.a.y };
          if (r.id === b.id)
            return sameSize
              ? {
                  ...r,
                  x_position: plan.b.x,
                  y_position: plan.b.y,
                  doors: a.doors,
                  windows: a.windows,
                  vents: a.vents,
                }
              : { ...r, x_position: plan.b.x, y_position: plan.b.y };
          return r;
        }),
      ),
    });
    return true;
  },

  rotateRoom: (id) => {
    const { rooms, plot } = get();
    const room = rooms.find((r) => r.id === id);
    if (!room) return false;
    const next = {
      x: room.x_position,
      y: room.y_position,
      width: room.length,
      length: room.width,
    };
    if (!isValidPlacement(next, rooms, plot, id)) return false;
    set({
      rooms: pruneInteriorWindows(
        rooms.map((r) =>
          r.id === id
            ? {
                ...r,
                width: next.width,
                length: next.length,
                doors: transposeWallItems(r.doors),
                windows: transposeWallItems(r.windows),
                vents: transposeWallItems(r.vents),
              }
            : r,
        ),
      ),
    });
    return true;
  },

  resizeRoom: (id, rect) => {
    const { rooms, plot } = get();
    const room = rooms.find((r) => r.id === id);
    const next = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      length: Math.round(rect.length),
    };
    if (!room || !isBigEnough(next) || !isValidPlacement(next, rooms, plot, id))
      return false;
    set({
      rooms: pruneInteriorWindows(
        rooms.map((r) => (r.id === id ? applyRect(r, next) : r)),
      ),
    });
    return true;
  },

  updateRoom: (id, patch) => {
    const room = get().rooms.find((r) => r.id === id);
    if (!room) return false;
    const resized = get().resizeRoom(id, {
      x: room.x_position,
      y: room.y_position,
      width: patch.width ?? room.width,
      length: patch.length ?? room.length,
    });
    if (!resized) return false;
    const type = patch.type ?? room.type;
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === id
          ? {
              ...r,
              type,
              customName:
                type === "custom" ? patch.customName?.trim() : undefined,
            }
          : r,
      ),
    }));
    return true;
  },

  replaceRooms: (rooms) =>
    set({
      rooms: rooms.map((r) => ({ ...r, id: createId() })),
      selectedId: null,
    }),

  removeRoom: (id) =>
    set((s) => ({
      rooms: s.rooms.filter((r) => r.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  addDoor: (roomId, wall) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              doors: [
                ...(r.doors ?? []),
                wall ? doorOnWall(r, wall) : defaultDoorFor(r),
              ],
            }
          : r,
      ),
    })),

  updateDoor: (roomId, doorId, patch) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              doors: (r.doors ?? []).map((d) =>
                d.id === doorId ? normalizeDoor(r, { ...d, ...patch }) : d,
              ),
            }
          : r,
      ),
    })),

  moveDoorTo: (roomId, doorId, x, y) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              doors: (r.doors ?? []).map((d) =>
                d.id === doorId ? moveWallItemToPoint(r, d, x, y, DOOR.min) : d,
              ),
            }
          : r,
      ),
    })),

  removeDoor: (roomId, doorId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? { ...r, doors: (r.doors ?? []).filter((d) => d.id !== doorId) }
          : r,
      ),
    })),

  autoPlaceDoors: () => {
    const { rooms, plot } = get();
    const placed = autoPlaceDoors(rooms, plot);
    set({ rooms: rooms.map((r, i) => ({ ...r, doors: placed[i] })) });
    return placed.reduce((n, d) => n + d.length, 0);
  },

  addWindow: (roomId, wall) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              windows: [
                ...(r.windows ?? []),
                wall ? windowOnWall(r, wall) : defaultWindowFor(r),
              ],
            }
          : r,
      ),
    })),

  updateWindow: (roomId, windowId, patch) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              windows: (r.windows ?? []).map((w) =>
                w.id === windowId
                  ? normalizeWallItem(r, { ...w, ...patch }, WINDOW.min)
                  : w,
              ),
            }
          : r,
      ),
    })),

  moveWindowTo: (roomId, windowId, x, y) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              windows: (r.windows ?? []).map((w) =>
                w.id === windowId
                  ? moveWallItemToPoint(r, w, x, y, WINDOW.min)
                  : w,
              ),
            }
          : r,
      ),
    })),

  removeWindow: (roomId, windowId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              windows: (r.windows ?? []).filter((w) => w.id !== windowId),
            }
          : r,
      ),
    })),

  addVent: (roomId, wall) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? { ...r, vents: [...(r.vents ?? []), ventOnWall(r, wall)] }
          : r,
      ),
    })),

  updateVent: (roomId, ventId, patch) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              vents: (r.vents ?? []).map((v) =>
                v.id === ventId
                  ? normalizeWallItem(r, { ...v, ...patch }, VENT.min)
                  : v,
              ),
            }
          : r,
      ),
    })),

  moveVentTo: (roomId, ventId, x, y) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              vents: (r.vents ?? []).map((v) =>
                v.id === ventId ? moveWallItemToPoint(r, v, x, y, VENT.min) : v,
              ),
            }
          : r,
      ),
    })),

  removeVent: (roomId, ventId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? { ...r, vents: (r.vents ?? []).filter((v) => v.id !== ventId) }
          : r,
      ),
    })),

  autoPlaceVents: () => {
    const { rooms } = get();
    const placed = autoPlaceVents(rooms);
    set({ rooms: rooms.map((r, i) => ({ ...r, vents: placed[i] })) });
    return placed.reduce((n, v) => n + v.length, 0);
  },

  autoPlaceWindows: () => {
    const { rooms } = get();
    const placed = autoPlaceWindows(rooms);
    set({ rooms: rooms.map((r, i) => ({ ...r, windows: placed[i] })) });
    return placed.reduce((n, w) => n + w.length, 0);
  },

  selectRoom: (id) => set({ selectedId: id }),

  clearRooms: () => set({ rooms: [], selectedId: null }),
}));
