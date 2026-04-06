"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#0f766e", "#f59e0b", "#dc2626"];

export function DifficultyDonut({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={54} outerRadius={82} paddingAngle={4}>
            {data.map((entry, index) => (
              <Cell fill={COLORS[index % COLORS.length]} key={entry.name} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--card-strong)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
