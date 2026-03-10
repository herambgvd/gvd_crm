import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addTroubleshootingAction,
  fetchTroubleshootingActions,
} from "../api";
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
import { Wrench, Plus, Save, Clock, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const TroubleshootingActionsTab = ({ ticketId, actions, ticketStatus }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    action_date_time: new Date().toISOString().slice(0, 16),
    action_performed_by: "",
    action_type: "",
    action_description: "",
    configuration_change: false,
    logs_collected: "",
    support_method: "",
    internal_status: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => addTroubleshootingAction(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast.success("Troubleshooting action added successfully!");
      setShowForm(false);
      setFormData({
        action_date_time: new Date().toISOString().slice(0, 16),
        action_performed_by: "",
        action_type: "",
        action_description: "",
        configuration_change: false,
        logs_collected: "",
        support_method: "",
        internal_status: "",
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to add action");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.action_performed_by ||
      !formData.action_type ||
      !formData.action_description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      ...formData,
      ticket_id: ticketId,
      action_date_time: new Date(formData.action_date_time).toISOString(),
    };

    createMutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Existing Actions */}
      {actions && actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Troubleshooting History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="border-l-2 border-primary pl-4 pb-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(action.action_date_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {action.action_performed_by}
                    </span>
                  </div>
                </div>
                <div className="mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                    {action.action_type}
                  </span>
                </div>
                <p className="text-sm">{action.action_description}</p>
                {action.configuration_change && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">
                      Configuration Changed
                    </span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add New Action */}
      {ticketStatus === "troubleshooting" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Troubleshooting Action
              </CardTitle>
              {!showForm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              )}
            </div>
          </CardHeader>
          {showForm && (
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="action_date_time">
                      Action Date & Time *
                    </Label>
                    <Input
                      id="action_date_time"
                      type="datetime-local"
                      value={formData.action_date_time}
                      onChange={(e) =>
                        handleChange("action_date_time", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="action_performed_by">Performed By *</Label>
                    <Input
                      id="action_performed_by"
                      value={formData.action_performed_by}
                      onChange={(e) =>
                        handleChange("action_performed_by", e.target.value)
                      }
                      placeholder="L1 / L2 / L3 / R&D"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="action_type">Action Type *</Label>
                  <Select
                    value={formData.action_type}
                    onValueChange={(value) =>
                      handleChange("action_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Investigation">
                        Investigation
                      </SelectItem>
                      <SelectItem value="Awaiting Customer">
                        Awaiting Customer
                      </SelectItem>
                      <SelectItem value="Escalated">Escalated</SelectItem>
                      <SelectItem value="Remote Support">
                        Remote Support
                      </SelectItem>
                      <SelectItem value="Onsite Support">
                        Onsite Support
                      </SelectItem>
                      <SelectItem value="Phone Support">
                        Phone Support
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="action_description">
                    Action Description *
                  </Label>
                  <Textarea
                    id="action_description"
                    value={formData.action_description}
                    onChange={(e) =>
                      handleChange("action_description", e.target.value)
                    }
                    placeholder="Describe what was checked or changed..."
                    rows={4}
                    required
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
                        Adding...
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Add Action
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      {actions?.length === 0 && ticketStatus !== "troubleshooting" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              No Troubleshooting Actions
            </h3>
            <p className="text-muted-foreground mb-4">
              Troubleshooting actions will appear here once the ticket enters
              troubleshooting phase.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TroubleshootingActionsTab;
