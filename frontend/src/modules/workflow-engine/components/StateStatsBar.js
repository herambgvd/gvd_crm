import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "../../../components/ui/card";
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

  // Auto-select first SOP when loaded
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
    <div className="space-y-3">
      {/* SOP Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">SOP:</span>
        {selectedSopId ? (
          <Select value={selectedSopId} onValueChange={onSopChange}>
            <SelectTrigger className="w-56 h-8 text-xs">
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

      {/* Stats Cards */}
      {selectedSopId && (
        <div className="flex flex-wrap gap-2">
          <Card
            className={`cursor-pointer transition-all ${
              !activeStateFilter
                ? "ring-1 ring-primary shadow-sm"
                : "hover:shadow-sm"
            }`}
            onClick={() => onStateFilter?.(null)}
          >
            <CardContent className="px-3 py-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Total
              </p>
              <p className="text-lg font-bold leading-tight">{total}</p>
            </CardContent>
          </Card>

          {statesList.map((state) => (
            <Card
              key={state.id}
              className={`cursor-pointer transition-all ${
                activeStateFilter === state.id
                  ? "ring-1 ring-primary shadow-sm"
                  : "hover:shadow-sm"
              }`}
              onClick={() => onStateFilter?.(state.id)}
            >
              <CardContent className="px-3 py-2">
                <p
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: state.color }}
                >
                  {state.name}
                </p>
                <p className="text-lg font-bold leading-tight">{state.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StateStatsBar;
