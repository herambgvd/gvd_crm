import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchWarranties, createWarranty } from "../api";
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
import { Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Warranties = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sales_order_id: "",
    serial_number: "",
    product_name: "",
    warranty_period_months: 12,
    warranty_start_date: "",
  });

  const { data: warranties, isLoading } = useQuery({
    queryKey: ["warranties"],
    queryFn: fetchWarranties,
  });

  const { data: salesOrdersData } = useQuery({
    queryKey: ["salesOrders", "dropdown"],
    queryFn: () => fetchSalesOrders({ page_size: 500 }),
  });
  const salesOrders = salesOrdersData?.items || [];

  const createMutation = useMutation({
    mutationFn: createWarranty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast.success("Warranty created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create warranty");
    },
  });

  const resetForm = () => {
    setFormData({
      sales_order_id: "",
      serial_number: "",
      product_name: "",
      warranty_period_months: 12,
      warranty_start_date: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      warranty_start_date: new Date(formData.warranty_start_date).toISOString(),
    };
    createMutation.mutate(data);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "bg-green-50 text-green-700 ring-green-600/20",
      expired: "bg-gray-50 text-gray-700 ring-gray-600/20",
      claimed: "bg-orange-50 text-orange-700 ring-orange-600/20",
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
      <div className="space-y-6" data-testid="warranties-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold font-heading tracking-tight">
              Warranties
            </h1>
            <p className="text-gray-600 mt-2">
              Manage product warranties and RMA tracking
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-warranty-btn">
                <Plus className="mr-2 h-4 w-4" />
                New Warranty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Warranty</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-testid="warranty-form"
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
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        serial_number: e.target.value,
                      })
                    }
                    required
                    data-testid="serial-number-input"
                  />
                </div>
                <div>
                  <Label htmlFor="product_name">Product Name</Label>
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
                  <Label htmlFor="warranty_period_months">
                    Warranty Period (Months)
                  </Label>
                  <Input
                    id="warranty_period_months"
                    type="number"
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
                  <Label htmlFor="warranty_start_date">
                    Warranty Start Date
                  </Label>
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
                    data-testid="submit-warranty-btn"
                  >
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Warranties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warranties?.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  No warranties found. Create your first warranty!
                </p>
              </CardContent>
            </Card>
          ) : (
            warranties?.map((warranty) => (
              <Card
                key={warranty.id}
                className="border border-gray-200 hover:shadow-md transition-all"
                data-testid="warranty-card"
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg font-heading">
                          {warranty.product_name}
                        </h3>
                      </div>
                      {getStatusBadge(warranty.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Serial Number:</span>
                        <span className="font-mono font-medium">
                          {warranty.serial_number}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Period:</span>
                        <span className="font-medium">
                          {warranty.warranty_period_months} months
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-mono">
                          {format(
                            new Date(warranty.warranty_start_date),
                            "MMM dd, yyyy",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="font-mono">
                          {format(
                            new Date(warranty.warranty_end_date),
                            "MMM dd, yyyy",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Warranties;
