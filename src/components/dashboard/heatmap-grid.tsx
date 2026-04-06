import { format } from "date-fns";

import { cn } from "@/lib/utils";

export function HeatmapGrid({
  entries,
}: {
  entries: Array<{ date: Date; intensity: number; minutesCommitted: number; solvedCount: number }>;
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {entries.map((entry) => (
        <div
          className={cn(
            "group relative aspect-square rounded-xl border border-border/70",
            entry.intensity === 0 && "bg-background/60",
            entry.intensity === 1 && "bg-primary/15",
            entry.intensity === 2 && "bg-primary/30",
            entry.intensity === 3 && "bg-primary/50",
            entry.intensity === 4 && "bg-primary text-primary-foreground",
          )}
          key={entry.date.toISOString()}
        >
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-xl border border-border bg-card-strong px-3 py-2 text-xs shadow-xl group-hover:block">
            <p>{format(entry.date, "dd MMM")}</p>
            <p>{entry.minutesCommitted} mins</p>
            <p>{entry.solvedCount} solved</p>
          </div>
        </div>
      ))}
    </div>
  );
}
