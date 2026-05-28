"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartProps {
  data: any[];
  metric: "cpu" | "ram" | "disk";
  color: string;
}

export default function ServerChart({ data, metric, color }: ChartProps) {
  // Safety check to prevent .map error
  if (!data || data.length === 0) {
    return (
      <div className="h-40 w-full mt-4 flex items-center justify-center text-slate-500 text-xs italic bg-slate-900/20 rounded-lg">
        Collecting initial data...
      </div>
    );
  }

  const chartData = data.map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    value: m[metric],
  }));

  return (
    <div className="h-40 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
            opacity={0.1}
          />
          <XAxis dataKey="time" hide={true} />
          <YAxis hide={true} domain={[0, 100]} />

          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
            }}
            itemStyle={{ color: color, fontWeight: "bold" }}
            labelStyle={{
              color: "#94a3b8",
              fontSize: "10px",
              marginBottom: "4px",
            }}
            formatter={(value: any) => [`${value}%`, metric.toUpperCase()]}
            labelFormatter={(label) => `Time: ${label}`}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fillOpacity={1}
            fill={`url(#color${metric})`}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
