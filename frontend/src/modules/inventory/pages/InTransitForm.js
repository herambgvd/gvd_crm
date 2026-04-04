import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  createInTransitShipment,
  updateInTransitShipment,
  fetchInTransitShipment,
  fetchFactoryOrders,
} from "../api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const InTransitForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const factoryOrderIdFromUrl = searchParams.get("factory_order_id");

  const [formData, setFormData] = useState({
    factory_order_id: factoryOrderIdFromUrl || "",
    tracking_number: "",
    carrier: "",
    ship_date: "",
    estimated_arrival: "",
    shipping_method: "",
    items: [],
    notes: "",
  });

  // Fetch existing record if editing
  const { data: existingRecord, isLoading: isLoadingRecord } = useQuery({
    queryKey: ["inTransitRecord", id],
    queryFn: () => fetchInTransitShipment(id),
    enabled: isEdit,
  });

  // Fetch factory orders for dropdown (confirmed and partially shipped orders)
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["factoryOrders", "shippable"],
    queryFn: () => fetchFactoryOrders({ page_size: 100 }), // Fetch all, filter on frontend
  });

  // Filter factory orders - use useMemo to recalculate when formData.factory_order_id changes
  const factoryOrders = useMemo(() => {
    return (ordersData?.items || []).filter(
      (order) =>
        ["confirmed", "partially_shipped", "shipped"].includes(order.status) ||
        order.id === formData.factory_order_id, // Always include current order when editing
    );
  }, [ordersData?.items, formData.factory_order_id]);

  // Get selected factory order details
  const selectedFactoryOrder = factoryOrders.find(
    (order) => order.id === formData.factory_order_id,
  );

  // Auto-populate factory order details if coming from factory order page
  useEffect(() => {
    if (factoryOrderIdFromUrl && !isEdit) {
      setFormData((prev) => ({
        ...prev,
        factory_order_id: factoryOrderIdFromUrl,
      }));
    }
  }, [factoryOrderIdFromUrl, isEdit]);

  // Auto-populate items when factory order is selected
  useEffect(() => {
    if (formData.factory_order_id && selectedFactoryOrder && !isEdit) {
      // Only auto-populate if items are empty (don't override existing items)
      if (formData.items.length === 0 && selectedFactoryOrder.items) {
        const shipmentItems = selectedFactoryOrder.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity_shipped: item.quantity_ordered, // Default to ordered quantity
          quantity_ordered: item.quantity_ordered, // Keep reference to ordered qty
        }));
        setFormData((prev) => ({
          ...prev,
          items: shipmentItems,
        }));
      }
    }
  }, [
    formData.factory_order_id,
    selectedFactoryOrder,
    isEdit,
    formData.items.length,
  ]);

  // Populate form when editing
  useEffect(() => {
    if (existingRecord) {
      setFormData({
        factory_order_id: existingRecord.factory_order_id || "",
        tracking_number: existingRecord.tracking_number || "",
        carrier: existingRecord.carrier || "",
        ship_date: existingRecord.ship_date?.split("T")[0] || "",
        estimated_arrival:
          existingRecord.estimated_arrival?.split("T")[0] || "",
        shipping_method: existingRecord.shipping_method || "",
        items: (existingRecord.items || []).map((item) => ({
          ...item,
          quantity_shipped: item.quantity, // Map backend 'quantity' to form 'quantity_shipped'
        })),
        notes: existingRecord.notes || "",
      });
    }
  }, [existingRecord]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createInTransitShipment,
    onSuccess: () => {
      queryClient.invalidateQueries(["inTransitInventory"]);
      queryClient.invalidateQueries(["inventorySummary"]);
      toast.success("Shipment created successfully");
      navigate("/stock-management/in-transit");
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((err) => {
          toast.error(
            `${err.loc?.join(".") || "Validation error"}: ${err.msg}`,
          );
        });
      } else {
        toast.error(detail || "Failed to create shipment");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateInTransitShipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["inTransitInventory"]);
      queryClient.invalidateQueries(["inventorySummary"]);
      toast.success("Shipment updated successfully");
      navigate("/stock-management/in-transit");
    },
    onError: (error) => {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((err) => {
          toast.error(
            `${err.loc?.join(".") || "Validation error"}: ${err.msg}`,
          );
        });
      } else {
        toast.error(detail || "Failed to update shipment");
      }
    },
  });

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.factory_order_id) {
      toast.error("Please select a factory order");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const submitData = {
      factory_order_id: formData.factory_order_id,
      tracking_number: formData.tracking_number || null,
      carrier: formData.carrier || null,
      shipping_method: formData.shipping_method || null,
      notes: formData.notes || null,
      items: formData.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity_shipped,
      })),
      ship_date: formData.ship_date
        ? new Date(formData.ship_date).toISOString()
        : null,
      estimated_arrival: formData.estimated_arrival
        ? new Date(formData.estimated_arrival).toISOString()
        : null,
    };

    if (isEdit) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {isEdit ? "Edit Shipment" : "New Shipment"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? "Update shipment details"
                : "Record a new in-transit shipment"}
            </p>
          </div>
        </div>

        {/* Show loading when editing and data is loading */}
        {isEdit && isLoadingRecord ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground">
                Loading shipment details...
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Shipment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="factory_order_id">Factory Order *</Label>
                    <Select
                      key={`factory-order-${formData.factory_order_id || "empty"}`}
                      value={formData.factory_order_id}
                      onValueChange={(v) =>
                        setFormData({ ...formData, factory_order_id: v })
                      }
                      disabled={ordersLoading || isEdit}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {selectedFactoryOrder
                            ? `${selectedFactoryOrder.order_number} - ${selectedFactoryOrder.factory_name}`
                            : ordersLoading
                              ? "Loading orders..."
                              : factoryOrders.length === 0
                                ? "No factory orders available"
                                : "Select factory order"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {factoryOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number} - {order.factory_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tracking_number">Tracking Number</Label>
                    <Input
                      id="tracking_number"
                      value={formData.tracking_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tracking_number: e.target.value,
                        })
                      }
                      placeholder="Enter tracking number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carrier">Carrier Name</Label>
                    <Input
                      id="carrier"
                      value={formData.carrier}
                      onChange={(e) =>
                        setFormData({ ...formData, carrier: e.target.value })
                      }
                      placeholder="e.g., DHL, FedEx, BlueDart"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping_method">Shipping Method</Label>
                    <Select
                      key={`shipping-method-${formData.shipping_method || "empty"}`}
                      value={formData.shipping_method}
                      onValueChange={(v) =>
                        setFormData({ ...formData, shipping_method: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="air">Air Freight</SelectItem>
                        <SelectItem value="sea">Sea Freight</SelectItem>
                        <SelectItem value="road">Road Transport</SelectItem>
                        <SelectItem value="express">Express Courier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ship_date">Ship Date</Label>
                    <Input
                      id="ship_date"
                      type="date"
                      value={formData.ship_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ship_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_arrival">Estimated Arrival</Label>
                    <Input
                      id="estimated_arrival"
                      type="date"
                      value={formData.estimated_arrival}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_arrival: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipment Items */}
            <Card>
              <CardHeader>
                <CardTitle>Shipment Items</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Items from factory order. Adjust quantities as needed for this
                  shipment (based on container lot size).
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items List */}
                {formData.items.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3">Product</th>
                            <th className="text-left p-3">SKU</th>
                            {selectedFactoryOrder && (
                              <th className="text-right p-3">Ordered</th>
                            )}
                            <th className="text-right p-3">Qty Shipped</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3">{item.product_name}</td>
                              <td className="p-3 text-muted-foreground">
                                {item.product_sku}
                              </td>
                              {selectedFactoryOrder && (
                                <td className="p-3 text-right text-muted-foreground">
                                  {item.quantity_ordered || 0}
                                </td>
                              )}
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="1"
                                  max={item.quantity_ordered || 999999}
                                  value={item.quantity_shipped}
                                  onChange={(e) => {
                                    const newItems = [...formData.items];
                                    newItems[index].quantity_shipped =
                                      parseInt(e.target.value) || 1;
                                    setFormData({
                                      ...formData,
                                      items: newItems,
                                    });
                                  }}
                                  className="w-24 text-right"
                                />
                              </td>
                              <td className="p-3">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground border rounded-lg">
                    {selectedFactoryOrder
                      ? "Loading factory order items..."
                      : "Please select a factory order to view items."}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes about the shipment..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? "Update Shipment" : "Create Shipment"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default InTransitForm;
