"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

export function ConsistencyChart({
  data,
}: {
  data: Array<{ label: string; minutes: number }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="minutesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.45} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "var(--card-strong)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
            }}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="var(--primary)"
            fill="url(#minutesGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
