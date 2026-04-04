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

/**
 * Dynamic stats cards that replace hardcoded status cards.
 * Shows a SOP selector and one card per state with record counts.
 *
 * Props:
 *   module: "sales" | "support" | "inventory"
 *   selectedSopId: controlled SOP ID
 *   onSopChange: (sopId) => void
 *   onStateFilter: (stateId | null) => void  — optional click-to-filter
 *   activeStateFilter: string | null
 */
const StateStatsBar = ({
  module,
  selectedSopId,
  onSopChange,
  onStateFilter,
  activeStateFilter,
}) => {
  const { data: sops = [] } = useQuery({
    queryKey: ["sops", module],
    queryFn: () => fetchSOPsByModule(module),
  });

  const { data: stats } = useQuery({
    queryKey: ["workflow-stats", module, selectedSopId],
    queryFn: () => fetchWorkflowStats(module, selectedSopId),
    enabled: !!selectedSopId,
  });

  // Auto-select first SOP if none selected
  React.useEffect(() => {
    if (!selectedSopId && sops.length > 0) {
      onSopChange(sops[0].id);
    }
  }, [sops, selectedSopId, onSopChange]);

  const statesList = stats?.states || [];
  const total = stats?.total || 0;

  return (
    <div className="space-y-4">
      {/* SOP Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">SOP:</span>
        <Select value={selectedSopId || ""} onValueChange={onSopChange}>
          <SelectTrigger className="w-64">
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
      </div>

      {/* Stats Cards */}
      {selectedSopId && (
        <div className="flex flex-wrap gap-3">
          {/* Total card */}
          <Card
            className={`cursor-pointer transition-all min-w-[120px] ${
              !activeStateFilter
                ? "ring-2 ring-primary"
                : "hover:shadow-md"
            }`}
            onClick={() => onStateFilter?.(null)}
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Total
              </p>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>

          {statesList.map((state) => (
            <Card
              key={state.id}
              className={`cursor-pointer transition-all min-w-[120px] ${
                activeStateFilter === state.id
                  ? "ring-2 ring-primary"
                  : "hover:shadow-md"
              }`}
              onClick={() => onStateFilter?.(state.id)}
            >
              <CardContent className="p-4">
                <p
                  className="text-xs font-medium uppercase"
                  style={{ color: state.color }}
                >
                  {state.name}
                </p>
                <p className="text-2xl font-bold">{state.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StateStatsBar;
