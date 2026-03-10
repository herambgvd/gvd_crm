import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  createLead,
  updateLead,
  fetchLead,
  deleteLead,
  createLeadInvolvement,
} from "../api";
import { fetchEntities } from "../../entities/api";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const LeadForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    source: "",
    channel: "",
    entity_id: "",
    project_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    company: "",
    priority: "medium",
    expected_value: "",
    probability: "",
    expected_close_date: "",
    notes: "",
  });

  const [additionalInfo, setAdditionalInfo] = useState([
    { key: "", value: "" },
  ]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: lead, isLoading: isLoadingLead } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLead(id),
    enabled: isEdit,
  });

  const { data: entities } = useQuery({
    queryKey: ["entities", formData.channel],
    queryFn: () => fetchEntities(formData.channel),
    enabled: !!formData.channel,
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        source: lead.source,
        channel: lead.channel,
        entity_id: lead.entity_id || "",
        project_name: lead.project_name || "",
        contact_name: lead.contact_name,
        contact_email: lead.contact_email || "",
        contact_phone: lead.contact_phone,
        company: lead.company,
        priority: lead.priority || "medium",
        expected_value: lead.expected_value ?? "",
        probability: lead.probability ?? "",
        expected_close_date: lead.expected_close_date
          ? lead.expected_close_date.split("T")[0]
          : "",
        notes: lead.notes || "",
      });

      // Load additional_information
      if (
        lead.additional_information &&
        typeof lead.additional_information === "object"
      ) {
        const info = Object.entries(lead.additional_information).map(
          ([key, value]) => ({
            key,
            value,
          }),
        );
        setAdditionalInfo(info.length > 0 ? info : [{ key: "", value: "" }]);
      }
    }
  }, [lead]);

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: async (newLead) => {
      queryClient.invalidateQueries(["leads"]);

      // Auto-create involvement if channel is consultant, distributor, or si and entity is selected
      const channelToTypeMap = {
        consultant: "consultant",
        distributor: "distributor",
        si: "si",
      };

      if (formData.channel in channelToTypeMap && formData.entity_id) {
        try {
          await createLeadInvolvement({
            lead_id: newLead.id,
            entity_id: formData.entity_id,
            involvement_type: channelToTypeMap[formData.channel],
            status: "active",
            notes: `Auto-created from lead channel: ${formData.channel}`,
            assigned_boqs: [],
            additional_information: { auto_created: true },
          });
          toast.success("Lead created successfully with involvement!");
        } catch (error) {
          console.error("Failed to create involvement:", error);
          toast.success(
            "Lead created successfully! (Involvement creation failed - please add manually)",
          );
        }
      } else {
        toast.success("Lead created successfully!");
      }

      navigate("/leads");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create lead");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["leads"]);
      toast.success("Lead updated successfully!");
      navigate("/leads");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update lead");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["leads"]);
      toast.success("Lead deleted successfully!");
      navigate("/leads");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete lead");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = { ...formData };

    // Convert numeric fields
    if (
      submitData.expected_value !== "" &&
      submitData.expected_value !== null
    ) {
      submitData.expected_value = Number(submitData.expected_value);
    } else {
      delete submitData.expected_value;
    }
    if (submitData.probability !== "" && submitData.probability !== null) {
      submitData.probability = Number(submitData.probability);
    } else {
      delete submitData.probability;
    }
    if (!submitData.expected_close_date) {
      delete submitData.expected_close_date;
    }

    // Convert additional_information array to dict/object
    if (additionalInfo.length > 0) {
      const infoObject = {};
      additionalInfo.forEach((info) => {
        if (info.key.trim() && info.value.trim()) {
          infoObject[info.key.trim()] = info.value.trim();
        }
      });
      if (Object.keys(infoObject).length > 0) {
        submitData.additional_information = infoObject;
      }
    }

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChannelChange = (value) => {
    setFormData({ ...formData, channel: value, entity_id: "" });
  };

  const addAdditionalInfo = () => {
    setAdditionalInfo([...additionalInfo, { key: "", value: "" }]);
  };

  const removeAdditionalInfo = (index) => {
    setAdditionalInfo(additionalInfo.filter((_, i) => i !== index));
  };

  const updateAdditionalInfo = (index, field, value) => {
    const updated = [...additionalInfo];
    updated[index][field] = value;
    setAdditionalInfo(updated);
  };

  const handleDelete = () => {
    if (id) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoadingLead) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full px-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/leads")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Button>
          {isEdit && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Lead
            </Button>
          )}
        </div>

        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-heading">
              {isEdit ? "Edit Lead" : "Create New Lead"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              data-testid="lead-form"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source *</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                    placeholder="e.g., Website, Referral, Cold Call"
                    required
                    data-testid="source-input"
                  />
                </div>
                <div>
                  <Label htmlFor="channel">Channel *</Label>
                  <Select
                    key={`channel-${formData.channel}`}
                    value={formData.channel}
                    onValueChange={handleChannelChange}
                  >
                    <SelectTrigger data-testid="channel-select">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">
                        Consultant Sales
                      </SelectItem>
                      <SelectItem value="project">Project Sales</SelectItem>
                      <SelectItem value="oem">B2B/OEM Sales</SelectItem>
                      <SelectItem value="distributor">
                        Distributor Sales
                      </SelectItem>
                      <SelectItem value="dealer">
                        Channel/Dealer Sales
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.channel && entities && entities.length > 0 && (
                <div>
                  <Label htmlFor="entity_id">Select Entity</Label>
                  <Select
                    value={formData.entity_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, entity_id: value })
                    }
                  >
                    <SelectTrigger data-testid="entity-select">
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.company_name} - {entity.contact_person}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Link this lead to an existing entity for better analytics
                  </p>
                  {formData.entity_id &&
                    ["consultant", "distributor", "si"].includes(
                      formData.channel,
                    ) && (
                      <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded">
                        💡 <strong>Auto-Involvement:</strong> This entity will
                        be automatically added to lead involvement as a{" "}
                        {formData.channel} when the lead is created.
                      </div>
                    )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="project_name">Project Name</Label>
                  <Input
                    id="project_name"
                    value={formData.project_name}
                    onChange={(e) =>
                      setFormData({ ...formData, project_name: e.target.value })
                    }
                    placeholder="e.g., Office CCTV Installation"
                    data-testid="project-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value })
                    }
                    required
                    data-testid="contact-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    required
                    data-testid="company-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_email: e.target.value,
                      })
                    }
                    data-testid="contact-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Phone *</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_phone: e.target.value,
                      })
                    }
                    required
                    data-testid="contact-phone-input"
                  />
                </div>
              </div>

              {/* Priority, Expected Value, Probability, Close Date */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger data-testid="priority-select">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expected_value">Expected Value (₹)</Label>
                  <Input
                    id="expected_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.expected_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expected_value: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    data-testid="expected-value-input"
                  />
                </div>
                <div>
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) =>
                      setFormData({ ...formData, probability: e.target.value })
                    }
                    placeholder="0-100"
                    data-testid="probability-input"
                  />
                </div>
                <div>
                  <Label htmlFor="expected_close_date">
                    Expected Close Date
                  </Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expected_close_date: e.target.value,
                      })
                    }
                    data-testid="close-date-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Additional Information</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalInfo}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Info
                  </Button>
                </div>
                <div className="space-y-2">
                  {additionalInfo.map((info, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Key (e.g., Budget)"
                        value={info.key}
                        onChange={(e) =>
                          updateAdditionalInfo(index, "key", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value (e.g., 5 Lakhs)"
                        value={info.value}
                        onChange={(e) =>
                          updateAdditionalInfo(index, "value", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAdditionalInfo(index)}
                        disabled={additionalInfo.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/leads")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  data-testid="submit-lead-btn"
                >
                  {isEdit ? "Update Lead" : "Create Lead"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                lead
                <strong className="block mt-2 text-foreground">
                  {lead?.contact_name} ({lead?.company})
                </strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default LeadForm;
