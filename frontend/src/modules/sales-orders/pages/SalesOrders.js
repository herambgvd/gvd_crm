import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  fetchSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
} from "../api";
import { fetchLeads } from "../../leads/api";
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
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SalesOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    lead_id: "",
    channel: "",
    customer_name: "",
    total_amount: 0,
    po_number: "",
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["salesOrders"],
    queryFn: () => fetchSalesOrders({ page_size: 100 }),
  });
  const orders = ordersData?.items || [];

  const { data: leadsData } = useQuery({
    queryKey: ["leads", "dropdown"],
    queryFn: () => fetchLeads({ page_size: 500 }),
  });
  const leads = leadsData?.items || [];

  const createMutation = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      toast.success("Proforma invoice created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create proforma invoice",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSalesOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      toast.success("Proforma invoice deleted successfully!");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to delete proforma invoice",
      );
    },
  });

  const resetForm = () => {
    setFormData({
      lead_id: "",
      channel: "",
      customer_name: "",
      total_amount: 0,
      po_number: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEdit = (orderId) => {
    navigate(`/sales-orders/${orderId}`);
  };

  const handleDelete = (orderId) => {
    if (
      window.confirm("Are you sure you want to delete this proforma invoice?")
    ) {
      deleteMutation.mutate(orderId);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
      confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
      in_progress: "bg-purple-50 text-purple-700 ring-purple-600/20",
      completed: "bg-green-50 text-green-700 ring-green-600/20",
      cancelled: "bg-red-50 text-red-700 ring-red-600/20",
    };
    return (
      <Badge className={`${variants[status]} ring-1 ring-inset`}>
        {status.replace("_", " ")}
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
      <div className="space-y-6" data-testid="sales-orders-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Proforma Invoices
            </h1>
            <p className="text-sm text-muted-foreground">
              Track and manage all proforma invoices
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-sales-order-btn">
                <Plus className="mr-2 h-4 w-4" />
                New Proforma Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Proforma Invoice</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-testid="sales-order-form"
              >
                <div>
                  <Label htmlFor="lead_id">Lead</Label>
                  <Select
                    value={formData.lead_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, lead_id: value })
                    }
                  >
                    <SelectTrigger data-testid="lead-select">
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.contact_name} - {lead.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="channel">Channel</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, channel: value })
                    }
                  >
                    <SelectTrigger data-testid="channel-select">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="oem">B2B/OEM</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_name: e.target.value,
                      })
                    }
                    required
                    data-testid="customer-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="total_amount">Total Amount</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_amount: Number(e.target.value),
                      })
                    }
                    required
                    data-testid="total-amount-input"
                  />
                </div>
                <div>
                  <Label htmlFor="po_number">PO Number (Optional)</Label>
                  <Input
                    id="po_number"
                    value={formData.po_number}
                    onChange={(e) =>
                      setFormData({ ...formData, po_number: e.target.value })
                    }
                    data-testid="po-number-input"
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
                    data-testid="submit-sales-order-btn"
                  >
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Orders Table */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      PI #
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Customer
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Channel
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Amount
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      PO Number
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-gray-500"
                      >
                        No proforma invoices found. Create your first invoice!
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b hover:bg-gray-50"
                        data-testid="sales-order-row"
                      >
                        <td className="p-4 font-mono text-sm">
                          {order.order_number}
                        </td>
                        <td className="p-4 text-sm">{order.customer_name}</td>
                        <td className="p-4 text-sm capitalize">
                          {order.channel}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          ₹{order.total_amount.toLocaleString()}
                        </td>
                        <td className="p-4">{getStatusBadge(order.status)}</td>
                        <td className="p-4 font-mono text-sm">
                          {order.po_number || "-"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(order.id)}
                              data-testid="edit-sales-order-btn"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(order.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid="delete-sales-order-btn"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

export default SalesOrders;
