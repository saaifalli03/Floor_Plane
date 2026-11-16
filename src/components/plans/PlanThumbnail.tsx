import { ROOM_COLORS } from "@/constants/floorPlan";
import type { PlanData } from "@/utils/planFile";

/** A small drawing of a plan's rooms, for the saved-plans list. */
export default function PlanThumbnail({ plan }: { plan: PlanData }) {
  const { width, length } = plan.plot;
  const stroke = Math.max(width, length) / 120;
  return (
    <svg
      viewBox={`0 0 ${width} ${length}`}
      className="h-14 w-20 shrink-0 rounded border border-slate-200 bg-white"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {plan.rooms.map((r, i) => (
        <rect
          key={i}
          x={r.x_position}
          y={r.y_position}
          width={r.width}
          height={r.length}
          fill={ROOM_COLORS[r.type].fill}
          stroke={ROOM_COLORS[r.type].border}
          strokeWidth={stroke}
        />
      ))}
    </svg>
  );
}
