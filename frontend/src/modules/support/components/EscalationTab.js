import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEscalation } from "../api";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { ArrowUpRight, Plus, Save, Calendar, User, Tag } from "lucide-react";
import { toast } from "sonner";

const EscalationTab = ({ ticketId, escalation, ticketStatus }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(
    !escalation && ticketStatus === "escalated",
  );
  const [formData, setFormData] = useState({
    escalation_level: "",
    escalation_date: new Date().toISOString().slice(0, 16),
    escalated_by: "",
    escalated_to: "",
    escalation_reason: "",
    escalation_notes: "",
    root_cause_category: "",
    rnd_reference_id: "",
    fix_provided_by: "",
    fix_type: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => createEscalation(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast.success("Escalation created successfully!");
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create escalation",
      );
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.escalation_level ||
      !formData.escalated_by ||
      !formData.escalated_to ||
      !formData.escalation_reason
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      ...formData,
      ticket_id: ticketId,
      escalation_date: new Date(formData.escalation_date).toISOString(),
    };

    createMutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (escalation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Escalation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">
                    Escalation Level
                  </Label>
                  <p className="text-lg font-semibold text-red-600">
                    {escalation.escalation_level}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Escalation Date</Label>
                  <p className="text-sm">
                    {new Date(escalation.escalation_date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Escalated By</Label>
                  <p className="text-sm">{escalation.escalated_by}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Escalated To</Label>
                <p className="text-sm">{escalation.escalated_to}</p>
              </div>
            </div>

            <div className="space-y-4">
              {escalation.root_cause_category && (
                <div>
                  <Label className="text-sm font-medium">
                    Root Cause Category
                  </Label>
                  <p className="text-sm">{escalation.root_cause_category}</p>
                </div>
              )}

              {escalation.rnd_reference_id && (
                <div>
                  <Label className="text-sm font-medium">
                    R&D Reference ID
                  </Label>
                  <p className="text-sm font-mono">
                    {escalation.rnd_reference_id}
                  </p>
                </div>
              )}

              {escalation.fix_provided_by && (
                <div>
                  <Label className="text-sm font-medium">Fix Provided By</Label>
                  <p className="text-sm">{escalation.fix_provided_by}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-sm capitalize">
                  {escalation.escalation_status}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Escalation Reason</Label>
              <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                {escalation.escalation_reason}
              </p>
            </div>

            {escalation.escalation_notes && (
              <div>
                <Label className="text-sm font-medium">Escalation Notes</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                  {escalation.escalation_notes}
                </p>
              </div>
            )}

            {escalation.escalation_resolution && (
              <div>
                <Label className="text-sm font-medium">
                  Escalation Resolution
                </Label>
                <p className="text-sm mt-1 p-3 bg-green-50 rounded-md">
                  {escalation.escalation_resolution}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Created by {escalation.created_by} on{" "}
            {new Date(escalation.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showForm && ticketStatus !== "escalated") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <ArrowUpRight className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Escalation</h3>
          <p className="text-muted-foreground mb-4">
            This ticket has not been escalated. Escalation details will appear
            here when the ticket is escalated.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5" />
          Create Escalation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="escalation_level">Escalation Level *</Label>
              <Select
                value={formData.escalation_level}
                onValueChange={(value) =>
                  handleChange("escalation_level", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select escalation level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L2">L2</SelectItem>
                  <SelectItem value="L3">L3</SelectItem>
                  <SelectItem value="R&D">R&D</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="escalation_date">Escalation Date *</Label>
              <Input
                id="escalation_date"
                type="datetime-local"
                value={formData.escalation_date}
                onChange={(e) =>
                  handleChange("escalation_date", e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="escalated_by">Escalated By *</Label>
              <Input
                id="escalated_by"
                value={formData.escalated_by}
                onChange={(e) => handleChange("escalated_by", e.target.value)}
                placeholder="Enter escalator name"
                required
              />
            </div>

            <div>
              <Label htmlFor="escalated_to">Escalated To *</Label>
              <Input
                id="escalated_to"
                value={formData.escalated_to}
                onChange={(e) => handleChange("escalated_to", e.target.value)}
                placeholder="Enter escalation target"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="escalation_reason">Escalation Reason *</Label>
            <Textarea
              id="escalation_reason"
              value={formData.escalation_reason}
              onChange={(e) =>
                handleChange("escalation_reason", e.target.value)
              }
              placeholder="Describe why this ticket is being escalated..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="escalation_notes">Escalation Notes</Label>
            <Textarea
              id="escalation_notes"
              value={formData.escalation_notes}
              onChange={(e) => handleChange("escalation_notes", e.target.value)}
              placeholder="Additional notes or context..."
              rows={2}
            />
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Escalation
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EscalationTab;
