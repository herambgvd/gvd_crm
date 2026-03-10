import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createResolution } from "../api";
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
import {
  CheckCircle,
  Plus,
  Save,
  Calendar,
  User,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const ResolutionTab = ({ ticketId, resolution, ticketStatus }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(
    !resolution && ticketStatus === "resolved",
  );
  const [formData, setFormData] = useState({
    resolution_date_time: new Date().toISOString().slice(0, 16),
    first_root_cause: "",
    resolution_summary: "",
    preventive_steps: "",
    firmware_version_after_fix: "",
    downtime_duration: "",
    resolution_type: "Resolved",
    technical_notes: "",
    knowledge_base_entry: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => createResolution(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast.success("Resolution created successfully!");
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create resolution",
      );
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.first_root_cause || !formData.resolution_summary) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      ...formData,
      ticket_id: ticketId,
      resolution_date_time: new Date(
        formData.resolution_date_time,
      ).toISOString(),
    };

    createMutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (resolution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolution Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">
                    Resolution Date & Time
                  </Label>
                  <p className="text-sm">
                    {new Date(resolution.resolution_date_time).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Resolution Type</Label>
                <p className="text-sm">{resolution.resolution_type}</p>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Resolved By</Label>
                  <p className="text-sm">{resolution.resolved_by}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {resolution.firmware_version_after_fix && (
                <div>
                  <Label className="text-sm font-medium">
                    Firmware Version After Fix
                  </Label>
                  <p className="text-sm">
                    {resolution.firmware_version_after_fix}
                  </p>
                </div>
              )}

              {resolution.downtime_duration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">
                      Downtime Duration
                    </Label>
                    <p className="text-sm">{resolution.downtime_duration}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Root Cause</Label>
              <p className="text-sm mt-1 p-3 bg-blue-50 rounded-md">
                {resolution.first_root_cause}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Resolution Summary</Label>
              <p className="text-sm mt-1 p-3 bg-green-50 rounded-md">
                {resolution.resolution_summary}
              </p>
            </div>

            {resolution.preventive_steps && (
              <div>
                <Label className="text-sm font-medium">Preventive Steps</Label>
                <p className="text-sm mt-1 p-3 bg-yellow-50 rounded-md">
                  {resolution.preventive_steps}
                </p>
              </div>
            )}

            {resolution.technical_notes && (
              <div>
                <Label className="text-sm font-medium">Technical Notes</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                  {resolution.technical_notes}
                </p>
              </div>
            )}

            {resolution.knowledge_base_entry && (
              <div>
                <Label className="text-sm font-medium">
                  Knowledge Base Entry
                </Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                  {resolution.knowledge_base_entry}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Created on {new Date(resolution.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showForm && ticketStatus !== "resolved") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Resolution</h3>
          <p className="text-muted-foreground mb-4">
            Resolution details will appear here once the ticket is marked as
            resolved.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Create Resolution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resolution_date_time">
                Resolution Date & Time *
              </Label>
              <Input
                id="resolution_date_time"
                type="datetime-local"
                value={formData.resolution_date_time}
                onChange={(e) =>
                  handleChange("resolution_date_time", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="resolution_type">Resolution Type</Label>
              <Select
                value={formData.resolution_type}
                onValueChange={(value) =>
                  handleChange("resolution_type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Workaround">Workaround</SelectItem>
                  <SelectItem value="Escalated to OEM">
                    Escalated to OEM
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="first_root_cause">Root Cause *</Label>
            <Textarea
              id="first_root_cause"
              value={formData.first_root_cause}
              onChange={(e) => handleChange("first_root_cause", e.target.value)}
              placeholder="Clearly describe the root cause of the issue..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="resolution_summary">Resolution Summary *</Label>
            <Textarea
              id="resolution_summary"
              value={formData.resolution_summary}
              onChange={(e) =>
                handleChange("resolution_summary", e.target.value)
              }
              placeholder="Describe how the issue was resolved..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="preventive_steps">Preventive Steps</Label>
            <Textarea
              id="preventive_steps"
              value={formData.preventive_steps}
              onChange={(e) => handleChange("preventive_steps", e.target.value)}
              placeholder="Steps to prevent this issue from recurring..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firmware_version_after_fix">
                Firmware Version After Fix
              </Label>
              <Input
                id="firmware_version_after_fix"
                value={formData.firmware_version_after_fix}
                onChange={(e) =>
                  handleChange("firmware_version_after_fix", e.target.value)
                }
                placeholder="Updated firmware version"
              />
            </div>

            <div>
              <Label htmlFor="downtime_duration">Downtime Duration</Label>
              <Input
                id="downtime_duration"
                value={formData.downtime_duration}
                onChange={(e) =>
                  handleChange("downtime_duration", e.target.value)
                }
                placeholder="e.g., 2 hours 30 minutes"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="technical_notes">Technical Notes</Label>
            <Textarea
              id="technical_notes"
              value={formData.technical_notes}
              onChange={(e) => handleChange("technical_notes", e.target.value)}
              placeholder="Additional technical details or notes..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="knowledge_base_entry">Knowledge Base Entry</Label>
            <Textarea
              id="knowledge_base_entry"
              value={formData.knowledge_base_entry}
              onChange={(e) =>
                handleChange("knowledge_base_entry", e.target.value)
              }
              placeholder="Information for future reference in knowledge base..."
              rows={3}
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
                  Create Resolution
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResolutionTab;
