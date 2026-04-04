import React from "react";
import { Badge } from "../../../components/ui/badge";

/**
 * Renders a colored badge for a record's current SOP state.
 * Falls back to a gray "No State" badge if no state info is available.
 */
const StateBadge = ({ stateName, stateColor }) => {
  if (!stateName) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        No State
      </Badge>
    );
  }

  return (
    <Badge
      className="text-xs font-medium text-white"
      style={{ backgroundColor: stateColor || "#6B7280" }}
    >
      {stateName}
    </Badge>
  );
};

export default StateBadge;
