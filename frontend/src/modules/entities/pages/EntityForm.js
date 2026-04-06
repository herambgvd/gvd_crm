import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createEntity, updateEntity, fetchEntity } from "../api";
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
import { Card, CardContent } from "../../../components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEntity } from "../api";

const EntityForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    entity_type: "",
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    gstin: "",
    notes: "",
  });

  const { data: entity, isLoading: isLoadingEntity } = useQuery({
    queryKey: ["entity", id],
    queryFn: () => fetchEntity(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (entity) {
      setFormData({
        entity_type: (entity.entity_type || "").toLowerCase(),
        company_name: entity.company_name,
        contact_person: entity.contact_person,
        email: entity.email || "",
        phone: entity.phone,
        address: entity.address || "",
        city: entity.city || "",
        state: entity.state || "",
        gstin: entity.gstin || "",
        notes: entity.notes || "",
      });
    }
  }, [entity]);

  const createMutation = useMutation({
    mutationFn: createEntity,
    onSuccess: () => {
      queryClient.invalidateQueries(["entities"]);
      toast.success("Entity created successfully!");
      navigate("/entities");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create entity");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateEntity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["entities"]);
      toast.success("Entity updated successfully!");
      navigate("/entities");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update entity");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["entities"]);
      toast.success("Entity deleted successfully!");
      navigate("/entities");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete entity");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this entity?")) {
      deleteMutation.mutate();
    }
  };

  if (isLoadingEntity) {
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
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/entities")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Entities
          </Button>
          {isEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} data-testid="entity-form">
          {/* Section: Basic Info */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isEdit ? "Edit Entity" : "New Entity"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Entity Type *</Label>
                  <Select
                    key={`entity-type-${formData.entity_type}`}
                    value={formData.entity_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, entity_type: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm" data-testid="entity-type-select">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                      <SelectItem value="si">System Integrator (SI)</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="end_customer">End Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Company Name *</Label>
                  <Input
                    className="h-9 text-sm"
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    required
                    data-testid="company-name-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Contact Person *</Label>
                  <Input
                    className="h-9 text-sm"
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_person: e.target.value })
                    }
                    required
                    data-testid="contact-person-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone *</Label>
                  <Input
                    className="h-9 text-sm"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                    data-testid="phone-input"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  className="h-9 text-sm"
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  data-testid="email-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Address */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p>
              <div>
                <Label className="text-xs">Address</Label>
                <Textarea
                  className="text-sm resize-none"
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                  data-testid="address-input"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input
                    className="h-9 text-sm"
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    data-testid="city-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">State</Label>
                  <Input
                    className="h-9 text-sm"
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    data-testid="state-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pincode</Label>
                  <Input
                    className="h-9 text-sm"
                    id="pincode"
                    value={formData.pincode || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Additional */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional</p>
              <div>
                <Label className="text-xs">GSTIN</Label>
                <Input
                  className="h-9 text-sm"
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value })
                  }
                  placeholder="29ABCDE1234F1Z5"
                  data-testid="gstin-input"
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  className="text-sm resize-none"
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                  data-testid="notes-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/entities")}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="submit-entity-btn"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEdit ? "Update" : "Create Entity"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EntityForm;
