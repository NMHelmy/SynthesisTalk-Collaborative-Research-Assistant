import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList
} from 'recharts';

export default function InsightsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} />
        <YAxis
          tickFormatter={(value) =>
            value >= 1_000_000_000
              ? `${(value / 1_000_000_000).toFixed(1)}B`
              : value >= 1_000_000
              ? `${(value / 1_000_000).toFixed(1)}M`
              : value
          }
        />
        <Tooltip
          formatter={(value) => value.toLocaleString()}
        />
        <Bar dataKey="value" fill="#8884d8">
          <LabelList
            dataKey="value"
            position="top"
            formatter={(val) => val.toLocaleString()}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
