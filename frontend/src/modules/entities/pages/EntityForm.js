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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
      <div className="max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/entities")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Entities
        </Button>

        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-heading">
              {isEdit ? "Edit Entity" : "Create New Entity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              data-testid="entity-form"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entity_type">Entity Type *</Label>
                  <Select
                    key={`entity-type-${formData.entity_type}`}
                    value={formData.entity_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, entity_type: value })
                    }
                  >
                    <SelectTrigger data-testid="entity-type-select">
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
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
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

              <div>
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  required
                  data-testid="contact-person-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    data-testid="email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
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
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                  data-testid="address-input"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    data-testid="city-input"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    data-testid="state-input"
                  />
                </div>
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) =>
                      setFormData({ ...formData, gstin: e.target.value })
                    }
                    placeholder="29ABCDE1234F1Z5"
                    data-testid="gstin-input"
                  />
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
                  onClick={() => navigate("/entities")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  data-testid="submit-entity-btn"
                >
                  {isEdit ? "Update Entity" : "Create Entity"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EntityForm;
