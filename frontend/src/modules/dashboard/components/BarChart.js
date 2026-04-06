import React from "react";

const BarChart = ({ data, maxHeight = 120 }) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height: maxHeight }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium">{d.value}</span>
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${(d.value / max) * (maxHeight - 24)}px`,
              backgroundColor: d.color || "#3B82F6",
              minHeight: d.value > 0 ? 4 : 0,
            }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BarChart;
