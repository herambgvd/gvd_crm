import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { fetchSOPsByModule, fetchWorkflowStats } from "../api";

const StateStatsBar = ({
  module,
  selectedSopId,
  onSopChange,
  onStateFilter,
  activeStateFilter,
}) => {
  const { data: sops = [] } = useQuery({
    queryKey: ["sops-module", module],
    queryFn: () => fetchSOPsByModule(module),
  });

  const { data: stats } = useQuery({
    queryKey: ["workflow-stats", module, selectedSopId],
    queryFn: () => fetchWorkflowStats(module, selectedSopId),
    enabled: !!selectedSopId,
  });

  React.useEffect(() => {
    if (sops.length > 0 && !selectedSopId) {
      onSopChange(sops[0].id);
    }
  }, [sops, selectedSopId, onSopChange]);

  const statesList = stats?.states || [];
  const total = stats?.total || 0;

  if (sops.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No workflows configured for this module.{" "}
        <a href="/settings/workflows/new" className="text-primary underline">
          Create one
        </a>
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* SOP Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">SOP:</span>
        {selectedSopId ? (
          <Select value={selectedSopId} onValueChange={onSopChange}>
            <SelectTrigger className="w-48 h-7 text-xs">
              <SelectValue placeholder="Select SOP" />
            </SelectTrigger>
            <SelectContent>
              {sops.map((sop) => (
                <SelectItem key={sop.id} value={sop.id}>
                  {sop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">Loading...</span>
        )}
      </div>

      {/* Stats row — full width, equal distribution */}
      {selectedSopId && (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${statesList.length + 1}, 1fr)` }}>
          {/* Total */}
          <button
            onClick={() => onStateFilter?.(null)}
            className={`text-left rounded-md border px-3 py-2 transition-all ${
              !activeStateFilter
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 hover:border-border hover:bg-muted/30"
            }`}
          >
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">
              Total
            </p>
            <p className="text-base font-bold mt-1 leading-none">{total}</p>
          </button>

          {statesList.map((state) => (
            <button
              key={state.id}
              onClick={() => onStateFilter?.(state.id)}
              className={`text-left rounded-md border px-3 py-2 transition-all ${
                activeStateFilter === state.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
            >
              <p
                className="text-[10px] font-medium uppercase tracking-wider leading-none truncate"
                style={{ color: state.color }}
              >
                {state.name}
              </p>
              <p className="text-base font-bold mt-1 leading-none">{state.count}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StateStatsBar;
