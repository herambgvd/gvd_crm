import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createTicket } from "../api";
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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const TicketForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    ticket_type: "",
    product_category: "",
    product_name: "",
    model_number: "",
    firmware_software_version: "",
    customer_name: "",
    project_name: "",
    location_site: "",
    priority: "Medium",
    sla_category: "No SLA",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket created successfully!");
      navigate(`/support/tickets/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create ticket");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    const requiredFields = [
      "ticket_type",
      "product_category",
      "product_name",
      "model_number",
      "customer_name",
      "project_name",
      "location_site",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        toast.error(`${field.replace("_", " ").toUpperCase()} is required`);
        setIsSubmitting(false);
        return;
      }
    }

    createMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/support/tickets")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">
              Create Support Ticket
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a new technical support ticket for tracking and resolution
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ticket Type */}
                <div>
                  <Label htmlFor="ticket_type">Ticket Type *</Label>
                  <Select
                    value={formData.ticket_type}
                    onValueChange={(value) =>
                      handleChange("ticket_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ticket type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Camera">Camera</SelectItem>
                      <SelectItem value="NVR">NVR</SelectItem>
                      <SelectItem value="VMS">VMS</SelectItem>
                      <SelectItem value="Integration">Integration</SelectItem>
                      <SelectItem value="Related">Related</SelectItem>
                      <SelectItem value="Commissioning">
                        Commissioning
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleChange("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="sla_category">SLA Category</Label>
                <Select
                  value={formData.sla_category}
                  onValueChange={(value) => handleChange("sla_category", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No SLA">No SLA</SelectItem>
                    <SelectItem value="Warranty">Warranty</SelectItem>
                    <SelectItem value="AMC">AMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_category">Product Category *</Label>
                  <Input
                    id="product_category"
                    value={formData.product_category}
                    onChange={(e) =>
                      handleChange("product_category", e.target.value)
                    }
                    placeholder="e.g., CCTV Camera, NVR, VMS"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) =>
                      handleChange("product_name", e.target.value)
                    }
                    placeholder="Enter product name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model_number">Model Number *</Label>
                  <Input
                    id="model_number"
                    value={formData.model_number}
                    onChange={(e) =>
                      handleChange("model_number", e.target.value)
                    }
                    placeholder="Enter model number"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="firmware_software_version">
                    Firmware/Software Version
                  </Label>
                  <Input
                    id="firmware_software_version"
                    value={formData.firmware_software_version}
                    onChange={(e) =>
                      handleChange("firmware_software_version", e.target.value)
                    }
                    placeholder="Enter version if applicable"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer & Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      handleChange("customer_name", e.target.value)
                    }
                    placeholder="Enter customer/partner name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="project_name">Project Name *</Label>
                  <Input
                    id="project_name"
                    value={formData.project_name}
                    onChange={(e) =>
                      handleChange("project_name", e.target.value)
                    }
                    placeholder="Enter project/site name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location_site">Location/Site *</Label>
                <Input
                  id="location_site"
                  value={formData.location_site}
                  onChange={(e) =>
                    handleChange("location_site", e.target.value)
                  }
                  placeholder="Enter location or site details"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/support/tickets")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TicketForm;
