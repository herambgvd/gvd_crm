import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createWarranty } from "../api";
import { fetchSalesOrders } from "../../sales-orders/api";
import { fetchLead } from "../../leads/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
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

const WarrantyForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    sales_order_id: "",
    serial_number: "",
    product_name: "",
    warranty_period_months: 12,
    warranty_start_date: "",
  });

  useEffect(() => {
    if (!leadId) {
      toast.error("Lead ID is missing. Redirecting...");
      setTimeout(() => navigate("/leads"), 2000);
    }
  }, [leadId, navigate]);

  const { data: lead } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => fetchLead(leadId),
    enabled: !!leadId,
  });

  const { data: allOrdersData } = useQuery({
    queryKey: ["salesOrders", "dropdown"],
    queryFn: () => fetchSalesOrders({ page_size: 500 }),
  });

  const ordersForLead = (allOrdersData?.items || []).filter(
    (o) => o.lead_id === leadId,
  );

  const createMutation = useMutation({
    mutationFn: createWarranty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Warranty created successfully!");
      navigate(`/leads/${leadId}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create warranty");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      warranty_start_date: new Date(formData.warranty_start_date).toISOString(),
    };
    createMutation.mutate(data);
  };

  return (
    <Layout>
      <div className="max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/leads/${leadId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lead
        </Button>

        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-heading">
              Register New Warranty
            </CardTitle>
            {lead && (
              <p className="text-sm text-gray-600">
                For: {lead.contact_name} - {lead.company}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              data-testid="warranty-form"
            >
              <div>
                <Label htmlFor="sales_order_id">Sales Order *</Label>
                <Select
                  value={formData.sales_order_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sales_order_id: value })
                  }
                >
                  <SelectTrigger data-testid="order-select">
                    <SelectValue placeholder="Select sales order" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordersForLead.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="product_name">Product Name *</Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                  required
                  data-testid="product-name-input"
                />
              </div>

              <div>
                <Label htmlFor="serial_number">Serial Number *</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) =>
                    setFormData({ ...formData, serial_number: e.target.value })
                  }
                  required
                  data-testid="serial-number-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warranty_period_months">
                    Warranty Period (Months) *
                  </Label>
                  <Input
                    id="warranty_period_months"
                    type="number"
                    min="1"
                    value={formData.warranty_period_months}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warranty_period_months: Number(e.target.value),
                      })
                    }
                    required
                    data-testid="warranty-period-input"
                  />
                </div>
                <div>
                  <Label htmlFor="warranty_start_date">Start Date *</Label>
                  <Input
                    id="warranty_start_date"
                    type="date"
                    value={formData.warranty_start_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warranty_start_date: e.target.value,
                      })
                    }
                    required
                    data-testid="warranty-start-date-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/leads/${leadId}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="submit-warranty-btn"
                >
                  Register Warranty
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default WarrantyForm;
