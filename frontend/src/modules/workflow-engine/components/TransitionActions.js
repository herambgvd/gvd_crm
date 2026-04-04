import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../components/ui/button";
import { ArrowRight } from "lucide-react";
import { fetchAvailableTransitions } from "../api";
import TransitionDialog from "./TransitionDialog";

/**
 * Renders available transition action buttons for a record.
 * When clicked, opens the TransitionDialog.
 *
 * Props:
 *   recordType: string
 *   recordId: string
 *   invalidateKeys: string[][] — query keys to invalidate on transition success
 */
const TransitionActions = ({ recordType, recordId, invalidateKeys = [] }) => {
  const [selectedTransition, setSelectedTransition] = useState(null);

  const { data: transitions = [] } = useQuery({
    queryKey: ["available-transitions", recordType, recordId],
    queryFn: () => fetchAvailableTransitions(recordType, recordId),
    enabled: !!recordId,
  });

  if (transitions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.id}
            variant="outline"
            size="sm"
            onClick={() => setSelectedTransition(t)}
            className="gap-1"
          >
            {t.name}
            <ArrowRight className="h-3 w-3" />
          </Button>
        ))}
      </div>

      <TransitionDialog
        open={!!selectedTransition}
        onClose={() => setSelectedTransition(null)}
        transition={selectedTransition}
        recordType={recordType}
        recordId={recordId}
        invalidateKeys={[
          ...invalidateKeys,
          ["available-transitions", recordType, recordId],
        ]}
      />
    </>
  );
};

export default TransitionActions;
