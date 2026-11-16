"use client";

import { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { INCHES_PER_FOOT } from "@/constants/floorPlan";
import {
  COLORS_3D,
  FLOOR_THICKNESS_IN,
  floorFinishOf,
} from "@/constants/view3d";
import type { PlotSize, Room } from "@/types/room";
import { FLOOR_TILE_FT, floorTexture } from "./floorTextures";

export interface FloorMeshProps {
  room: Room;
  plot: PlotSize;
  selected: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

/** A room's floor slab, surfaced with its finish (wood, tile, …) tiled at real size. */
export default function FloorMesh({
  room,
  plot,
  selected,
  onClick,
}: FloorMeshProps) {
  const finish = floorFinishOf(room);
  const ft = (inches: number) => inches / INCHES_PER_FOOT;
  const w = ft(room.width);
  const l = ft(room.length);

  const map = useMemo(() => {
    const texture = floorTexture(finish).clone();
    texture.repeat.set(w / FLOOR_TILE_FT[finish], l / FLOOR_TILE_FT[finish]);
    texture.needsUpdate = true;
    return texture;
  }, [finish, w, l]);
  useEffect(() => () => map.dispose(), [map]);

  return (
    <mesh
      position={[
        ft(room.x_position) + w / 2 - ft(plot.width) / 2,
        ft(FLOOR_THICKNESS_IN) / 2,
        ft(room.y_position) + l / 2 - ft(plot.length) / 2,
      ]}
      receiveShadow
      onClick={onClick}
    >
      <boxGeometry args={[w, ft(FLOOR_THICKNESS_IN), l]} />
      <meshStandardMaterial
        map={map}
        color={room.type === "vent_shaft" ? COLORS_3D.shaftFloor : "#ffffff"}
        emissive={selected ? COLORS_3D.selected : "#000000"}
        emissiveIntensity={selected ? 0.25 : 0}
        roughness={finish === "marble" || finish === "tile" ? 0.45 : 0.85}
      />
    </mesh>
  );
}
