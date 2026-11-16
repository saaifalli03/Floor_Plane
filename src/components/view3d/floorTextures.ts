import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { FloorFinish } from "@/types/room";

/**
 * Floor surfaces drawn on a canvas once and tiled across each floor. `tileFt` is how
 * many feet one copy of the image covers, so planks and tiles come out at real size.
 */
export const FLOOR_TILE_FT: Record<FloorFinish, number> = {
  wood: 4,
  tile: 4,
  marble: 4,
  carpet: 3,
  concrete: 8,
  grass: 4,
};

const SIZE = 256;

/** Small seeded random generator, so every load draws the same pattern. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const speckle = (
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  colors: string[],
  size: number,
) => {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.globalAlpha = 0.25 + rand() * 0.35;
    ctx.fillRect(rand() * SIZE, rand() * SIZE, size, size);
  }
  ctx.globalAlpha = 1;
};

const DRAW: Record<FloorFinish, (ctx: CanvasRenderingContext2D) => void> = {
  // 8 rows of 6" planks, staggered, in slightly different shades with fine grain.
  wood: (ctx) => {
    const rand = seeded(7);
    const shades = ["#b9875a", "#c4935f", "#ad7b4f", "#c99c6b", "#b58252"];
    const row = SIZE / 8;
    for (let r = 0; r < 8; r++) {
      let x = -rand() * SIZE * 0.5;
      while (x < SIZE) {
        const len = SIZE * (0.45 + rand() * 0.4);
        ctx.fillStyle = shades[Math.floor(rand() * shades.length)];
        ctx.fillRect(x, r * row, len, row);
        ctx.strokeStyle = "rgba(90,55,25,0.18)";
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          const y = r * row + 3 + rand() * (row - 6);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(
            x + len / 3,
            y + rand() * 3 - 1.5,
            x + (2 * len) / 3,
            y - rand() * 3 + 1.5,
            x + len,
            y,
          );
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(70,40,15,0.45)";
        ctx.fillRect(x, r * row, 1.5, row);
        x += len;
      }
      ctx.fillStyle = "rgba(70,40,15,0.4)";
      ctx.fillRect(0, r * row, SIZE, 1.5);
    }
  },
  // 2' square tiles with grout lines.
  tile: (ctx) => {
    const rand = seeded(3);
    const n = 2;
    const step = SIZE / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 226 + Math.floor(rand() * 10);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
        ctx.fillRect(i * step, j * step, step, step);
      }
    speckle(ctx, rand, 500, ["#cbd5e1", "#f8fafc"], 2);
    ctx.fillStyle = "#94a3b8";
    for (let k = 0; k <= n; k++) {
      ctx.fillRect(k * step - 1.5, 0, 3, SIZE);
      ctx.fillRect(0, k * step - 1.5, SIZE, 3);
    }
  },
  // White stone with soft grey veins, laid in 2' slabs.
  marble: (ctx) => {
    const rand = seeded(11);
    ctx.fillStyle = "#f4f4f2";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let v = 0; v < 7; v++) {
      ctx.strokeStyle = `rgba(120,120,130,${0.12 + rand() * 0.2})`;
      ctx.lineWidth = 0.6 + rand() * 1.6;
      ctx.beginPath();
      let x = rand() * SIZE;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < SIZE) {
        x += (rand() - 0.5) * 40;
        y += 12 + rand() * 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(160,160,165,0.6)";
    ctx.fillRect(SIZE / 2 - 0.5, 0, 1, SIZE);
    ctx.fillRect(0, SIZE / 2 - 0.5, SIZE, 1);
    ctx.fillRect(0, 0, 1, SIZE);
    ctx.fillRect(0, 0, SIZE, 1);
  },
  carpet: (ctx) => {
    const rand = seeded(5);
    ctx.fillStyle = "#a8a29e";
    ctx.fillRect(0, 0, SIZE, SIZE);
    speckle(ctx, rand, 6000, ["#78716c", "#d6d3d1", "#8f8984"], 1.5);
  },
  concrete: (ctx) => {
    const rand = seeded(9);
    ctx.fillStyle = "#b4b0aa";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle =
        rand() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      ctx.beginPath();
      ctx.arc(rand() * SIZE, rand() * SIZE, 10 + rand() * 40, 0, Math.PI * 2);
      ctx.fill();
    }
    speckle(ctx, rand, 1500, ["#78716c", "#e7e5e4"], 1.2);
    ctx.fillStyle = "rgba(80,75,70,0.35)";
    ctx.fillRect(0, 0, SIZE, 1.5);
    ctx.fillRect(0, 0, 1.5, SIZE);
  },
  grass: (ctx) => {
    const rand = seeded(13);
    ctx.fillStyle = "#5f9e2e";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 2500; i++) {
      ctx.strokeStyle = ["#4d7c0f", "#65a30d", "#7cb342", "#3f6212"][
        Math.floor(rand() * 4)
      ];
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y - 3 - rand() * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

const cache = new Map<FloorFinish, CanvasTexture>();

/** The shared texture for a finish (drawn on first use). Clone it to set a repeat. */
export const floorTexture = (finish: FloorFinish): CanvasTexture => {
  const hit = cache.get(finish);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  DRAW[finish](ctx);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(finish, texture);
  return texture;
};
