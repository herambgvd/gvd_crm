import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createInvoice } from "../api";
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

const InvoiceForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    sales_order_id: "",
    amount: 0,
    invoice_type: "full",
    due_date: "",
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
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Invoice created successfully!");
      navigate(`/leads/${leadId}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    },
  });

  const handleOrderSelect = (orderId) => {
    const order = ordersForLead.find((o) => o.id === orderId);
    if (order) {
      setFormData({
        ...formData,
        sales_order_id: orderId,
        amount: order.total_amount,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      due_date: new Date(formData.due_date).toISOString(),
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
              Create New Invoice
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
              data-testid="invoice-form"
            >
              <div>
                <Label htmlFor="sales_order_id">Sales Order *</Label>
                <Select
                  value={formData.sales_order_id}
                  onValueChange={handleOrderSelect}
                >
                  <SelectTrigger data-testid="order-select">
                    <SelectValue placeholder="Select sales order" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordersForLead.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - ₹
                        {order.total_amount.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) })
                  }
                  required
                  data-testid="amount-input"
                />
              </div>

              <div>
                <Label htmlFor="invoice_type">Invoice Type *</Label>
                <Select
                  value={formData.invoice_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, invoice_type: value })
                  }
                >
                  <SelectTrigger data-testid="invoice-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="running_bill">Running Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  required
                  data-testid="due-date-input"
                />
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
                  data-testid="submit-invoice-btn"
                >
                  Create Invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InvoiceForm;
