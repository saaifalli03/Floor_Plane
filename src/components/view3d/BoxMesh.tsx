"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { INCHES_PER_FOOT } from "@/constants/floorPlan";
import type { PlotSize } from "@/types/room";
import type { PartShape } from "@/utils/furniture";
import type { Box } from "@/utils/scene3d";

export interface BoxMeshProps {
  box: Box;
  plot: PlotSize;
  color: string;
  /** Shape filling the box: a block (default), upright or lying cylinder, or ellipsoid. */
  shape?: PartShape;
  opacity?: number;
  emissive?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

/**
 * One shape filling an axis-aligned box, from plan inches to scene feet: plan x → scene
 * x, plan y → scene z (depth), height → scene y. The plot is centred on the origin.
 */
export default function BoxMesh({
  box,
  plot,
  color,
  shape = "box",
  opacity = 1,
  emissive,
  castShadow = true,
  receiveShadow = true,
  onClick,
}: BoxMeshProps) {
  const ft = (inches: number) => inches / INCHES_PER_FOOT;
  const [sx, sy, sz] = [
    ft(box.x1 - box.x0),
    ft(box.z1 - box.z0),
    ft(box.y1 - box.y0),
  ];
  const position: [number, number, number] = [
    ft((box.x0 + box.x1) / 2 - plot.width / 2),
    ft((box.z0 + box.z1) / 2),
    ft((box.y0 + box.y1) / 2 - plot.length / 2),
  ];

  let geometry;
  let rotation: [number, number, number] = [0, 0, 0];
  let scale: [number, number, number] = [1, 1, 1];
  switch (shape) {
    case "cyl":
      geometry = (
        <cylinderGeometry
          args={[Math.min(sx, sz) / 2, Math.min(sx, sz) / 2, sy, 24]}
        />
      );
      break;
    case "cylX": // lying along plan x
      geometry = (
        <cylinderGeometry
          args={[Math.min(sy, sz) / 2, Math.min(sy, sz) / 2, sx, 24]}
        />
      );
      rotation = [0, 0, Math.PI / 2];
      break;
    case "cylY": // lying along plan y (scene z)
      geometry = (
        <cylinderGeometry
          args={[Math.min(sx, sy) / 2, Math.min(sx, sy) / 2, sz, 24]}
        />
      );
      rotation = [Math.PI / 2, 0, 0];
      break;
    case "sphere":
      geometry = <sphereGeometry args={[0.5, 20, 14]} />;
      scale = [sx, sy, sz];
      break;
    default:
      geometry = <boxGeometry args={[sx, sy, sz]} />;
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      onClick={onClick}
    >
      {geometry}
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.25 : 0}
        roughness={0.85}
      />
    </mesh>
  );
}
