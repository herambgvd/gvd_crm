import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Checkbox } from "../../../components/ui/checkbox";
import { Switch } from "../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { executeTransition, uploadTransitionFile } from "../api";
import { BACKEND_URL } from "../../../lib/axios";

const TransitionDialog = ({
  open,
  onClose,
  transition,
  recordType,
  recordId,
  invalidateKeys = [],
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [fileObjects, setFileObjects] = useState({}); // {fieldLabel: File}
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data) => executeTransition(data),
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      queryClient.invalidateQueries({ queryKey: ["workflow-stats"] });
      queryClient.invalidateQueries({ queryKey: ["transition-logs"] });
      toast.success(`Moved to "${transition.to_state_name}"`);
      setFormData({});
      setFileObjects({});
      setNotes("");
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Transition failed");
    },
  });

  if (!transition) return null;

  const fields = transition.form_fields || [];

  const handleSubmit = async () => {
    // Upload any pending files first
    const finalFormData = { ...formData };
    for (const [label, file] of Object.entries(fileObjects)) {
      if (file instanceof File) {
        try {
          const result = await uploadTransitionFile(file);
          finalFormData[label] = `${BACKEND_URL}${result.url}`;
        } catch {
          toast.error(`Failed to upload "${label}"`);
          return;
        }
      }
    }

    mutation.mutate({
      record_type: recordType,
      record_id: recordId,
      transition_id: transition.id,
      form_data: finalFormData,
      notes,
    });
  };

  const setField = (label, value) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  // Determine if a field should take full width
  const isWideField = (type) => ["textarea", "multiselect", "file"].includes(type);

  const renderField = (field) => {
    const value = formData[field.label] ?? field.default_value ?? "";

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            className="text-sm resize-none"
            rows={2}
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            className="h-9 text-sm"
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
            placeholder={field.placeholder || "0"}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            className="h-9 text-sm"
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
          />
        );
      case "select":
        return value ? (
          <Select value={value} onValueChange={(val) => setField(field.label, val)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  <span className="truncate max-w-[300px] block">{opt}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select onValueChange={(val) => setField(field.label, val)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  <span className="truncate max-w-[300px] block">{opt}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multiselect": {
        const selected = Array.isArray(formData[field.label])
          ? formData[field.label]
          : [];
        return (
          <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, opt]
                      : selected.filter((v) => v !== opt);
                    setField(field.label, next);
                  }}
                />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
        );
      }
      case "boolean":
        return (
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={formData[field.label] === true || formData[field.label] === "true"}
              onCheckedChange={(checked) => setField(field.label, checked)}
            />
            <span className="text-xs text-muted-foreground">
              {formData[field.label] === true || formData[field.label] === "true" ? "Yes" : "No"}
            </span>
          </div>
        );
      case "email":
        return (
          <Input
            type="email"
            className="h-9 text-sm"
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
            placeholder={field.placeholder || "example@email.com"}
          />
        );
      case "file":
        return (
          <div className="space-y-1">
            <Input
              type="file"
              className="h-9 text-sm file:mr-2 file:text-xs file:border-0 file:bg-muted file:px-2 file:py-1 file:rounded cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileObjects((prev) => ({ ...prev, [field.label]: f }));
                  setField(field.label, f.name);
                }
              }}
            />
            {formData[field.label] && (
              <p className="text-[10px] text-muted-foreground">
                Selected: {formData[field.label]}
              </p>
            )}
          </div>
        );
      default:
        return (
          <Input
            type="text"
            className="h-9 text-sm"
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">{transition.name}</DialogTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {transition.from_state_name}
            <ArrowRight className="h-3 w-3" />
            {transition.to_state_name}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* Dynamic fields in 2-col grid, wide fields span full width */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {fields.map((field) => (
              <div
                key={field.id || field.label}
                className={isWideField(field.type) ? "col-span-2" : ""}
              >
                <Label className="text-xs mb-1 block">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Notes always at bottom, full width */}
          <div className="mt-3 pt-3 border-t border-border/40">
            <Label className="text-xs mb-1 block">Notes</Label>
            <Textarea
              className="text-sm resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransitionDialog;
