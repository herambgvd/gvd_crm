import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createRma, updateRma, fetchRmaRecord } from "../api";
import { fetchProducts } from "../../products/api";
import { fetchEntities } from "../../entities/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const ISSUE_CATEGORIES = [
  { value: "hardware_failure", label: "Hardware Failure" },
  { value: "software_issue", label: "Software Issue" },
  { value: "cosmetic_damage", label: "Cosmetic Damage" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" },
];

const INITIAL_FORM = {
  product_id: "",
  entity_id: "",
  quantity: 1,
  serial_number: "",
  issue_description: "",
  issue_category: "",
  is_warranty_claim: false,
  notes: "",
  assigned_to: "",
};

const RMAForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(INITIAL_FORM);

  // Fetch existing record if editing
  const { data: existingRecord } = useQuery({
    queryKey: ["rmaDetail", id],
    queryFn: () => fetchRmaRecord(id),
    enabled: isEdit,
  });

  // Fetch products & entities for selects
  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProducts({ page_size: 1000 }),
  });

  const { data: entitiesData } = useQuery({
    queryKey: ["entities", "all"],
    queryFn: () => fetchEntities({ page_size: 1000 }),
  });

  const products = productsData?.items || [];
  const entities = entitiesData?.items || [];

  // Populate form when editing
  useEffect(() => {
    if (existingRecord) {
      setFormData({
        product_id: existingRecord.product_id || "",
        entity_id: existingRecord.entity_id || "",
        quantity: existingRecord.quantity || 1,
        serial_number: existingRecord.serial_number || "",
        issue_description: existingRecord.issue_description || "",
        issue_category: existingRecord.issue_category || "",
        is_warranty_claim: existingRecord.is_warranty_claim || false,
        notes: existingRecord.notes || "",
        assigned_to: existingRecord.assigned_to || "",
      });
    }
  }, [existingRecord]);

  const mutation = useMutation({
    mutationFn: (data) => (isEdit ? updateRma(id, data) : createRma(data)),
    onSuccess: () => {
      queryClient.invalidateQueries(["rmaRecords"]);
      if (isEdit) queryClient.invalidateQueries(["rmaDetail", id]);
      toast.success(isEdit ? "RMA updated" : "RMA created");
      navigate("/stock-management/rma");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to save RMA");
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.product_id) {
      toast.error("Please select a product");
      return;
    }
    if (!formData.entity_id) {
      toast.error("Please select a customer");
      return;
    }
    if (!formData.issue_description.trim()) {
      toast.error("Issue description is required");
      return;
    }
    if (formData.quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const payload = {
      ...formData,
      quantity: parseInt(formData.quantity, 10),
      serial_number: formData.serial_number || undefined,
      issue_category: formData.issue_category || undefined,
      notes: formData.notes || undefined,
      assigned_to: formData.assigned_to || undefined,
    };

    mutation.mutate(payload);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/stock-management/rma")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEdit ? "Edit RMA" : "New RMA"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? "Update the RMA record details"
                : "Log a product return or defect"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>RMA Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Product */}
              <div>
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(v) => handleChange("product_id", v)}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer / Entity */}
              <div>
                <Label htmlFor="entity">Customer *</Label>
                <Select
                  value={formData.entity_id}
                  onValueChange={(v) => handleChange("entity_id", v)}
                >
                  <SelectTrigger id="entity">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity & Serial Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) =>
                      handleChange("serial_number", e.target.value)
                    }
                    placeholder="e.g., SN-123456"
                  />
                </div>
              </div>

              {/* Issue Category */}
              <div>
                <Label htmlFor="issue_category">Issue Category</Label>
                <Select
                  value={formData.issue_category || ""}
                  onValueChange={(v) => handleChange("issue_category", v)}
                >
                  <SelectTrigger id="issue_category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Issue Description */}
              <div>
                <Label htmlFor="issue_description">Issue Description *</Label>
                <Textarea
                  id="issue_description"
                  value={formData.issue_description}
                  onChange={(e) =>
                    handleChange("issue_description", e.target.value)
                  }
                  placeholder="Describe the problem in detail..."
                  rows={4}
                />
              </div>

              {/* Warranty Claim */}
              <div className="flex items-center gap-3">
                <Switch
                  id="is_warranty_claim"
                  checked={formData.is_warranty_claim}
                  onCheckedChange={(v) => handleChange("is_warranty_claim", v)}
                />
                <Label htmlFor="is_warranty_claim" className="cursor-pointer">
                  Warranty Claim
                </Label>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/stock-management/rma")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {mutation.isPending
                    ? "Saving..."
                    : isEdit
                      ? "Save Changes"
                      : "Create RMA"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
};

export default RMAForm;
