import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIssueLogging } from "../api";
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
import { Calendar, User, Tag, FileText, Save, Plus } from "lucide-react";
import { toast } from "sonner";

const IssueLoggingTab = ({ ticketId, issueLogging, ticketStatus }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(!issueLogging);
  const [formData, setFormData] = useState({
    issue_reported_date_time: new Date().toISOString().slice(0, 16),
    reported_by: "",
    issue_category: "",
    issue_description: "",
    remarks: "",
    attachments: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => createIssueLogging(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast.success("Issue logging created successfully!");
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create issue logging",
      );
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.reported_by ||
      !formData.issue_category ||
      !formData.issue_description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      ...formData,
      ticket_id: ticketId,
      issue_reported_date_time: new Date(
        formData.issue_reported_date_time,
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

  if (issueLogging) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Issue Logging Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Issue Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">
                    Reported Date & Time
                  </Label>
                  <p className="text-sm">
                    {new Date(
                      issueLogging.issue_reported_date_time,
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Reported By</Label>
                  <p className="text-sm">{issueLogging.reported_by}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Issue Category</Label>
                  <p className="text-sm">{issueLogging.issue_category}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Issue Description</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                  {issueLogging.issue_description}
                </p>
              </div>

              {issueLogging.remarks && (
                <div>
                  <Label className="text-sm font-medium">Remarks</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                    {issueLogging.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {issueLogging.attachments && issueLogging.attachments.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Attachments
              </Label>
              <div className="flex flex-wrap gap-2">
                {issueLogging.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-muted rounded-md text-sm flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {attachment}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Created by {issueLogging.created_by} on{" "}
            {new Date(issueLogging.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showForm) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Issue Logging</h3>
          <p className="text-muted-foreground mb-4">
            Create issue logging to document the problem details and start the
            support process.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Issue Logging
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create Issue Logging
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue_reported_date_time">
                Reported Date & Time *
              </Label>
              <Input
                id="issue_reported_date_time"
                type="datetime-local"
                value={formData.issue_reported_date_time}
                onChange={(e) =>
                  handleChange("issue_reported_date_time", e.target.value)
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="reported_by">Reported By *</Label>
              <Select
                value={formData.reported_by}
                onValueChange={(value) => handleChange("reported_by", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reporter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="issue_category">Issue Category *</Label>
            <Select
              value={formData.issue_category}
              onValueChange={(value) => handleChange("issue_category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select issue category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Installation">Installation</SelectItem>
                <SelectItem value="Playback">Playback</SelectItem>
                <SelectItem value="Analytics">Analytics</SelectItem>
                <SelectItem value="Network">Network</SelectItem>
                <SelectItem value="Integration">Integration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="issue_description">Issue Description *</Label>
            <Textarea
              id="issue_description"
              value={formData.issue_description}
              onChange={(e) =>
                handleChange("issue_description", e.target.value)
              }
              placeholder="Describe the issue in detail..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              placeholder="Additional remarks or observations..."
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
                  Save Issue Logging
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default IssueLoggingTab;
