import React from "react";

const DonutChart = ({ data, size = 120 }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;

  const segments = data.map((d) => {
    const start = cumulative;
    cumulative += (d.value / total) * 360;
    return { ...d, start, end: cumulative };
  });

  const gradientParts = segments
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(", ");

  return (
    <div className="flex items-center gap-4">
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(${gradientParts || "#e5e7eb 0deg 360deg"})`,
          position: "relative",
        }}
      >
        <div
          className="absolute bg-background rounded-full flex items-center justify-center"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            top: size * 0.2,
            left: size * 0.2,
          }}
        >
          <span className="text-sm font-bold">{total}</span>
        </div>
      </div>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
            <span className="text-[10px] font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
