import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, User } from "lucide-react";
import { fetchTransitionLogs } from "../api";

/**
 * Displays the transition history timeline for a record.
 *
 * Props:
 *   recordType: string
 *   recordId: string
 */
const TransitionTimeline = ({ recordType, recordId }) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["transition-logs", recordType, recordId],
    queryFn: () => fetchTransitionLogs(recordType, recordId),
    enabled: !!recordId,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading history...</p>;
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No transition history.</p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

      {logs.map((log, index) => (
        <div key={log.id} className="relative pl-8 pb-4">
          {/* Dot */}
          <div
            className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${
              index === 0 ? "bg-primary" : "bg-muted-foreground"
            }`}
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{log.transition_name || "SOP Assigned"}</span>
              {log.from_state_name && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {log.from_state_name}
                  <ArrowRight className="h-3 w-3" />
                  {log.to_state_name}
                </span>
              )}
              {!log.from_state_name && (
                <span className="text-xs text-muted-foreground">
                  → {log.to_state_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {log.performed_by_name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(log.performed_at).toLocaleString()}
              </span>
            </div>

            {/* Form data */}
            {log.form_data && Object.keys(log.form_data).length > 0 && (
              <div className="mt-1 rounded bg-muted p-2 text-xs">
                {Object.entries(log.form_data).map(([key, val]) => (
                  <div key={key}>
                    <span className="font-medium">{key}:</span> {String(val)}
                  </div>
                ))}
              </div>
            )}

            {log.notes && (
              <p className="text-xs text-muted-foreground italic">
                {log.notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransitionTimeline;
