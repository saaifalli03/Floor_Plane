"use client";

/**
 * Plan symbol for a ventilation shaft: the space crossed corner to corner (⊠),
 * the usual mark for a vertical duct or void.
 */
export default function ShaftSymbol({
  widthPx,
  lengthPx,
  color,
}: {
  widthPx: number;
  lengthPx: number;
  color: string;
}) {
  const diagonal = Math.hypot(widthPx, lengthPx);
  const angle = (Math.atan2(lengthPx, widthPx) * 180) / Math.PI;
  const line = (deg: number) => ({
    left: (widthPx - diagonal) / 2,
    top: lengthPx / 2 - 0.75,
    width: diagonal,
    height: 1.5,
    background: color,
    transform: `rotate(${deg}deg)`,
  });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute" style={line(angle)} />
      <div className="absolute" style={line(-angle)} />
    </div>
  );
}
