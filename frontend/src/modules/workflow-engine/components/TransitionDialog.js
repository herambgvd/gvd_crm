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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { executeTransition } from "../api";

/**
 * Modal dialog for executing a transition.
 * Renders dynamic form fields defined on the transition.
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   transition: { id, name, from_state_name, to_state_name, form_fields }
 *   recordType: string
 *   recordId: string
 *   invalidateKeys: string[][] — query keys to invalidate on success
 */
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
      setNotes("");
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Transition failed");
    },
  });

  if (!transition) return null;

  const fields = transition.form_fields || [];

  const handleSubmit = () => {
    mutation.mutate({
      record_type: recordType,
      record_id: recordId,
      transition_id: transition.id,
      form_data: formData,
      notes,
    });
  };

  const setField = (label, value) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const renderField = (field) => {
    const value = formData[field.label] ?? field.default_value ?? "";

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
          />
        );
      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => setField(field.label, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setField(field.label, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transition.name}</DialogTitle>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {transition.from_state_name}
            <ArrowRight className="h-3 w-3" />
            {transition.to_state_name}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {fields.map((field) => (
            <div key={field.id || field.label}>
              <Label>
                {field.label}
                {field.required && " *"}
              </Label>
              {renderField(field)}
            </div>
          ))}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransitionDialog;
