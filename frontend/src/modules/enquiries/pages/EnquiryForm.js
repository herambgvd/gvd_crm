import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createEnquiry, updateEnquiry, fetchEnquiry } from "../api";
import { fetchEntities } from "../../entities/api";
import { fetchUsers } from "../../settings/api";
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
import { Badge } from "../../../components/ui/badge";
import { ArrowLeft, X, Plus } from "lucide-react";
import { toast } from "sonner";

const sourceOptions = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "trade_show", label: "Trade Show" },
  { value: "other", label: "Other" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const currencyOptions = [
  { value: "INR", label: "₹ INR" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
];

const EnquiryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    project_name: "",
    person_name: "",
    person_email: "",
    person_phone: "",
    date: new Date().toISOString().split("T")[0],
    details: "",
    budget: "",
    currency: "INR",
    source: "walk_in",
    priority: "medium",
    entity_connections: [],
    assigned_to: "",
    tags: [],
  });

  const [tagInput, setTagInput] = useState("");
  const [entitySearch, setEntitySearch] = useState("");
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);

  // Fetch existing enquiry for edit mode
  const { data: enquiry, isLoading: isLoadingEnquiry } = useQuery({
    queryKey: ["enquiry", id],
    queryFn: () => fetchEnquiry(id),
    enabled: isEdit,
  });

  // Fetch entities for connections
  const { data: entitiesData } = useQuery({
    queryKey: ["entities"],
    queryFn: () => fetchEntities({ page_size: 100 }),
  });
  const entities = entitiesData?.items || entitiesData || [];

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });

  useEffect(() => {
    if (enquiry && isEdit) {
      setFormData({
        project_name: enquiry.project_name || "",
        person_name: enquiry.person_name || "",
        person_email: enquiry.person_email || "",
        person_phone: enquiry.person_phone || "",
        date: enquiry.date
          ? new Date(enquiry.date).toISOString().split("T")[0]
          : "",
        details: enquiry.details || "",
        budget: enquiry.budget || "",
        currency: enquiry.currency || "INR",
        source: enquiry.source || "walk_in",
        priority: enquiry.priority || "medium",
        entity_connections: (enquiry.entity_connections || []).map((ec) => ({
          entity_id: ec.entity_id,
          entity_name: ec.entity_name || "",
          entity_type: ec.entity_type || "",
          role: ec.role || "",
        })),
        assigned_to: enquiry.assigned_to || "",
        tags: enquiry.tags || [],
      });
    }
  }, [enquiry, isEdit]);

  const createMutation = useMutation({
    mutationFn: createEnquiry,
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiries"]);
      toast.success("Enquiry created successfully!");
      navigate("/enquiries");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create enquiry");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateEnquiry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["enquiries"]);
      queryClient.invalidateQueries(["enquiry", id]);
      toast.success("Enquiry updated successfully!");
      navigate("/enquiries");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update enquiry");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.project_name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!formData.person_name.trim()) {
      toast.error("Person name is required");
      return;
    }

    const payload = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      date: formData.date ? new Date(formData.date).toISOString() : null,
      assigned_to: formData.assigned_to || null,
      entity_connections: formData.entity_connections.map((ec) => ({
        entity_id: ec.entity_id,
        role: ec.role || "",
      })),
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Entity Connections ──────────────────────────

  const filteredEntities = entities.filter((entity) => {
    if (!entitySearch) return false;
    const search = entitySearch.toLowerCase();
    const alreadyAdded = formData.entity_connections.some(
      (ec) => ec.entity_id === entity.id,
    );
    return (
      !alreadyAdded &&
      (entity.company_name?.toLowerCase().includes(search) ||
        entity.contact_person?.toLowerCase().includes(search))
    );
  });

  const addEntityConnection = (entity) => {
    setFormData((prev) => ({
      ...prev,
      entity_connections: [
        ...prev.entity_connections,
        {
          entity_id: entity.id,
          entity_name: entity.company_name,
          entity_type: entity.entity_type,
          role: "",
        },
      ],
    }));
    setEntitySearch("");
    setShowEntityDropdown(false);
  };

  const removeEntityConnection = (entityId) => {
    setFormData((prev) => ({
      ...prev,
      entity_connections: prev.entity_connections.filter(
        (ec) => ec.entity_id !== entityId,
      ),
    }));
  };

  const updateEntityRole = (entityId, role) => {
    setFormData((prev) => ({
      ...prev,
      entity_connections: prev.entity_connections.map((ec) =>
        ec.entity_id === entityId ? { ...ec, role } : ec,
      ),
    }));
  };

  // ─── Tags ────────────────────────────────────────

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingEnquiry) {
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEdit ? "Edit Enquiry" : "New Enquiry"}
            </h1>
            <p className="text-gray-500 mt-1">
              {isEdit
                ? "Update enquiry details"
                : "Create a new enquiry for a project or requirement"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="project_name">
                    Project Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="project_name"
                    value={formData.project_name}
                    onChange={(e) =>
                      handleChange("project_name", e.target.value)
                    }
                    placeholder="Enter project or requirement name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(v) => handleChange("source", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => handleChange("priority", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select
                    value={formData.assigned_to || "unassigned"}
                    onValueChange={(v) =>
                      handleChange("assigned_to", v === "unassigned" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(Array.isArray(users) ? users : users?.items || []).map(
                        (user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  value={formData.details}
                  onChange={(e) => handleChange("details", e.target.value)}
                  placeholder="Describe the enquiry requirements, specifications, etc."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Person / Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Person</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="person_name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="person_name"
                    value={formData.person_name}
                    onChange={(e) =>
                      handleChange("person_name", e.target.value)
                    }
                    placeholder="Contact person name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="person_email">Email</Label>
                  <Input
                    id="person_email"
                    type="email"
                    value={formData.person_email}
                    onChange={(e) =>
                      handleChange("person_email", e.target.value)
                    }
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="person_phone">Phone</Label>
                  <Input
                    id="person_phone"
                    value={formData.person_phone}
                    onChange={(e) =>
                      handleChange("person_phone", e.target.value)
                    }
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Amount</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => handleChange("budget", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => handleChange("currency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entity Connections */}
          <Card>
            <CardHeader>
              <CardTitle>Entity Connections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Link this enquiry to one or more entities (consultants, dealers,
                etc.)
              </p>

              {/* Search entity */}
              <div className="relative">
                <Input
                  value={entitySearch}
                  onChange={(e) => {
                    setEntitySearch(e.target.value);
                    setShowEntityDropdown(e.target.value.length > 0);
                  }}
                  onFocus={() => entitySearch && setShowEntityDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowEntityDropdown(false), 200)
                  }
                  placeholder="Search entities by name..."
                />
                {showEntityDropdown && filteredEntities.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredEntities.slice(0, 10).map((entity) => (
                      <button
                        type="button"
                        key={entity.id}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => addEntityConnection(entity)}
                      >
                        <div>
                          <span className="font-medium text-sm">
                            {entity.company_name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {entity.entity_type}
                          </span>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Connected entities */}
              {formData.entity_connections.length > 0 && (
                <div className="space-y-2">
                  {formData.entity_connections.map((ec) => (
                    <div
                      key={ec.entity_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-sm">
                          {ec.entity_name || ec.entity_id}
                        </span>
                        {ec.entity_type && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {ec.entity_type}
                          </Badge>
                        )}
                      </div>
                      <Input
                        className="w-40"
                        placeholder="Role (optional)"
                        value={ec.role}
                        onChange={(e) =>
                          updateEntityRole(ec.entity_id, e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => removeEntityConnection(ec.entity_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Type a tag and press Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/enquiries")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Enquiry"
                  : "Create Enquiry"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EnquiryForm;
