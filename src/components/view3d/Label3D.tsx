"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

export interface Label3DProps {
  text: string;
  position: [number, number, number];
  color: string;
  border: string;
}

/** Device pixels per CSS pixel used when drawing the label texture (keeps text crisp). */
const SCALE = 3;
const FONT_PX = 12;
const PAD_X = 8;
const HEIGHT_PX = 20;
/** Screen-space sprite size per CSS pixel (sizeAttenuation off: constant on-screen size). */
const SPRITE_UNITS_PER_PX = 0.0016;

/**
 * A room name that always faces the camera and stays the same size on screen.
 * Drawn onto a small canvas texture, so it lives entirely inside the WebGL scene.
 */
export default function Label3D({
  text,
  position,
  color,
  border,
}: Label3DProps) {
  const { texture, widthPx } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = `600 ${FONT_PX * SCALE}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.font = font;
    const widthPx = Math.ceil(ctx.measureText(text).width / SCALE) + PAD_X * 2;
    canvas.width = widthPx * SCALE;
    canvas.height = HEIGHT_PX * SCALE;

    const r = (HEIGHT_PX / 2) * SCALE;
    const w = canvas.width;
    const h = canvas.height;
    const lw = 1.5 * SCALE;
    ctx.beginPath();
    ctx.roundRect(lw / 2, lw / 2, w - lw, h - lw, r - lw / 2);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = border;
    ctx.stroke();

    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + SCALE);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    return { texture, widthPx };
  }, [text, color, border]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite
      position={position}
      scale={[
        widthPx * SPRITE_UNITS_PER_PX,
        HEIGHT_PX * SPRITE_UNITS_PER_PX,
        1,
      ]}
      renderOrder={10}
    >
      <spriteMaterial
        map={texture}
        sizeAttenuation={false}
        depthTest={false}
        transparent
      />
    </sprite>
  );
}
