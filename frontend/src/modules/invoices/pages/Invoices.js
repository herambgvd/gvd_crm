import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchInvoices, createInvoice } from "../api";
import { fetchSalesOrders } from "../../sales-orders/api";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Invoices = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sales_order_id: "",
    amount: 0,
    invoice_type: "full",
    due_date: "",
  });

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetchInvoices({ page_size: 100 }),
  });
  const invoices = invoicesData?.items || [];

  const { data: salesOrdersData } = useQuery({
    queryKey: ["salesOrders", "dropdown"],
    queryFn: () => fetchSalesOrders({ page_size: 500 }),
  });
  const salesOrders = salesOrdersData?.items || [];

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    },
  });

  const resetForm = () => {
    setFormData({
      sales_order_id: "",
      amount: 0,
      invoice_type: "full",
      due_date: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      due_date: new Date(formData.due_date).toISOString(),
    };
    createMutation.mutate(data);
  };

  const getStatusBadge = (status) => {
    const variants = {
      unpaid: "bg-red-50 text-red-700 ring-red-600/20",
      partial: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
      paid: "bg-green-50 text-green-700 ring-green-600/20",
    };
    return (
      <Badge className={`${variants[status]} ring-1 ring-inset`}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
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
      <div className="space-y-6" data-testid="invoices-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Invoices
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage invoices and track payments
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-invoice-btn">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-testid="invoice-form"
              >
                <div>
                  <Label htmlFor="sales_order_id">Sales Order</Label>
                  <Select
                    value={formData.sales_order_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sales_order_id: value })
                    }
                  >
                    <SelectTrigger data-testid="sales-order-select">
                      <SelectValue placeholder="Select sales order" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} - {order.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: Number(e.target.value),
                      })
                    }
                    required
                    data-testid="amount-input"
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_type">Invoice Type</Label>
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
                  <Label htmlFor="due_date">Due Date</Label>
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
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="submit-invoice-btn"
                  >
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invoices Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Invoice #
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Amount
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Type
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-12 text-gray-500"
                      >
                        No invoices found. Create your first invoice!
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b hover:bg-gray-50"
                        data-testid="invoice-row"
                      >
                        <td className="p-4 font-mono text-sm">
                          {invoice.invoice_number}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          ₹{invoice.amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-sm capitalize">
                          {invoice.invoice_type.replace("_", " ")}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Invoices;
