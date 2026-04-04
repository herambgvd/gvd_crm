import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { fetchSOPsByModule } from "../api";

const SOPSelector = ({ module, value, onChange, label = "Select SOP *" }) => {
  const { data: sops = [], isLoading } = useQuery({
    queryKey: ["sops-module", module],
    queryFn: () => fetchSOPsByModule(module),
  });

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {value ? (
        <Select value={value} onValueChange={onChange} disabled={isLoading}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Choose workflow" />
          </SelectTrigger>
          <SelectContent>
            {sops.map((sop) => (
              <SelectItem key={sop.id} value={sop.id}>
                {sop.name}
                {sop.description && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    — {sop.description}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Select onValueChange={onChange} disabled={isLoading}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue
              placeholder={isLoading ? "Loading..." : "Choose workflow"}
            />
          </SelectTrigger>
          <SelectContent>
            {sops.map((sop) => (
              <SelectItem key={sop.id} value={sop.id}>
                {sop.name}
                {sop.description && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    — {sop.description}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default SOPSelector;
