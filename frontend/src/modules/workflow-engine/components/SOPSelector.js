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

/**
 * SOP selector dropdown for record creation forms.
 *
 * Props:
 *   module: "sales" | "support" | "inventory"
 *   value: selected SOP ID
 *   onChange: (sopId) => void
 *   label: optional label text
 */
const SOPSelector = ({ module, value, onChange, label = "Select SOP *" }) => {
  const { data: sops = [], isLoading } = useQuery({
    queryKey: ["sops", module],
    queryFn: () => fetchSOPsByModule(module),
  });

  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || ""} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue
            placeholder={isLoading ? "Loading SOPs..." : "Choose workflow"}
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
    </div>
  );
};

export default SOPSelector;
