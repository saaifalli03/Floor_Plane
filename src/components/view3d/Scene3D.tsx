"use client";

import { forwardRef, useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { INCHES_PER_FOOT, ROOM_COLORS } from "@/constants/floorPlan";
import { COLORS_3D, CUTAWAY_HEIGHT_IN, wallPaintOf } from "@/constants/view3d";
import { useRoomLabel } from "@/hooks/useRoomLabel";
import { useRoomStore } from "@/store/useRoomStore";
import {
  buildDoorLeaves,
  buildPanes,
  buildInRoomStairs,
  buildStairs,
  buildWallPieces,
  clipToHeight,
} from "@/utils/scene3d";
import type { Part } from "@/utils/furniture";
import BoxMesh from "./BoxMesh";
import FloorMesh from "./FloorMesh";
import Label3D from "./Label3D";

export type SceneMode = "orbit" | "walk" | "tour";

export interface Scene3DProps {
  cutaway: boolean;
  /** In walk / tour mode the camera is driven by WalkController: no orbit, labels or picking. */
  mode?: SceneMode;
  /** Furniture and fittings to draw (empty when switched off). */
  furniture?: Part[];
}

/** Everything inside the 3D canvas: ground, floors, walls, openings, stairs, labels. */
const Scene3D = forwardRef<OrbitControlsImpl, Scene3DProps>(function Scene3D(
  { cutaway, mode = "orbit", furniture = [] },
  controlsRef,
) {
  const orbit = mode === "orbit";
  const plot = useRoomStore((s) => s.plot);
  const rooms = useRoomStore((s) => s.rooms);
  const selectedId = useRoomStore((s) => s.selectedId);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const roomLabel = useRoomLabel();

  const exteriorColor = useRoomStore((s) => s.exteriorColor);
  const walls = useMemo(
    () => buildWallPieces(rooms, cutaway),
    [rooms, cutaway],
  );
  const paint = useMemo(
    () => new Map(rooms.map((r) => [r.id, wallPaintOf(r)])),
    [rooms],
  );
  // In cut-away mode everything set into the walls is trimmed to the lowered height.
  const leaves = useMemo(
    () => clipToHeight(buildDoorLeaves(rooms), cutaway),
    [rooms, cutaway],
  );
  const glass = useMemo(
    () => clipToHeight(buildPanes(rooms, "windows"), cutaway),
    [rooms, cutaway],
  );
  const vents = useMemo(
    () => clipToHeight(buildPanes(rooms, "vents"), cutaway),
    [rooms, cutaway],
  );
  // In cut-away mode furniture is sliced at the same height as the walls.
  const pieces = useMemo(
    () =>
      cutaway
        ? furniture
            .filter((p) => p.box.z0 < CUTAWAY_HEIGHT_IN)
            .map((p) =>
              p.box.z1 > CUTAWAY_HEIGHT_IN && (p.shape ?? "box") === "box"
                ? { ...p, box: { ...p.box, z1: CUTAWAY_HEIGHT_IN } }
                : p,
            )
        : furniture,
    [furniture, cutaway],
  );
  const inRoomStairs = useMemo(() => buildInRoomStairs(rooms), [rooms]);
  const stairs = useMemo(
    () => [
      ...rooms.filter((r) => r.type === "stairs").flatMap(buildStairs),
      ...inRoomStairs.steps,
    ],
    [rooms, inRoomStairs],
  );

  const ft = (inches: number) => inches / INCHES_PER_FOOT;
  const plotW = ft(plot.width);
  const plotL = ft(plot.length);
  const span = Math.max(plotW, plotL);

  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <hemisphereLight args={["#ffffff", "#cbd5e1", 0.9]} />
      <directionalLight
        position={[span * 0.6, span, span * 0.4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
      />

      {/* Ground around the plot, and the plot itself. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[span * 4, span * 4]} />
        <meshStandardMaterial color={COLORS_3D.ground} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, 0]}
        receiveShadow
        onClick={
          orbit
            ? (e) => {
                e.stopPropagation();
                selectRoom(null);
              }
            : undefined
        }
      >
        <planeGeometry args={[plotW, plotL]} />
        <meshStandardMaterial color={COLORS_3D.plot} />
      </mesh>
      <gridHelper
        args={[span, Math.round(span), "#cbd5e1", "#e2e8f0"]}
        position={[0, 0, 0]}
      />

      {/* Room floors (click to select). */}
      {rooms.map((room) => (
        <FloorMesh
          key={room.id}
          room={room}
          plot={plot}
          selected={room.id === selectedId}
          onClick={
            orbit
              ? (e) => {
                  e.stopPropagation();
                  selectRoom(room.id);
                }
              : undefined
          }
        />
      ))}

      {walls.map(({ box, roomId }, i) => (
        <BoxMesh
          key={`w${i}`}
          box={box}
          plot={plot}
          color={roomId ? (paint.get(roomId) ?? COLORS_3D.wall) : exteriorColor}
        />
      ))}
      {leaves.map((box, i) => (
        <BoxMesh
          key={`d${i}`}
          box={box}
          plot={plot}
          color={COLORS_3D.doorLeaf}
        />
      ))}
      {glass.map((box, i) => (
        <BoxMesh
          key={`g${i}`}
          box={box}
          plot={plot}
          color={COLORS_3D.glass}
          opacity={0.35}
          castShadow={false}
        />
      ))}
      {vents.map((box, i) => (
        <BoxMesh key={`v${i}`} box={box} plot={plot} color={COLORS_3D.vent} />
      ))}
      {stairs.map((box, i) => (
        <BoxMesh key={`s${i}`} box={box} plot={plot} color={COLORS_3D.stairs} />
      ))}
      {/* Railings and under-stair cupboards on stairs built inside rooms. */}
      {inRoomStairs.parts.map((part, i) => (
        <BoxMesh key={`r${i}`} box={part.box} plot={plot} color={part.color} />
      ))}

      {pieces.map((part, i) => (
        <BoxMesh
          key={`f${i}`}
          box={part.box}
          plot={plot}
          color={part.color}
          shape={part.shape}
          opacity={part.opacity}
          castShadow={!part.walkThrough || part.shape === "sphere"}
        />
      ))}

      {/* Room names floating just above each floor. */}
      {orbit &&
        rooms.map((room) => (
          <Label3D
            key={`l${room.id}`}
            text={roomLabel(room)}
            color={ROOM_COLORS[room.type].text}
            border={ROOM_COLORS[room.type].border}
            position={[
              ft(room.x_position + room.width / 2) - plotW / 2,
              1,
              ft(room.y_position + room.length / 2) - plotL / 2,
            ]}
          />
        ))}

      {orbit && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={5}
          maxDistance={span * 4}
        />
      )}
    </>
  );
});

export default Scene3D;
