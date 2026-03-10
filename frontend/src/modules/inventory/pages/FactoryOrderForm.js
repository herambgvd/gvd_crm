import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  createFactoryOrder,
  updateFactoryOrder,
  fetchFactoryOrder,
} from "../api";
import { fetchProducts, fetchCategoryTree } from "../../products/api";
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
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { getCurrencySymbol } from "../utils";

const FactoryOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    order_number: "",
    factory_name: "",
    factory_contact: {
      name: "",
      email: "",
      phone: "",
    },
    items: [],
    tax_amount: 0,
    shipping_cost: 0,
    discount_amount: 0,
    currency: "INR",
    expected_delivery_date: "",
    payment_terms: "",
    notes: "",
  });

  // State for product selection with category/subcategory filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [newItem, setNewItem] = useState({
    product_id: "",
    quantity_ordered: 1,
    unit_price: 0,
  });

  // Fetch existing order if editing
  const { data: existingOrder } = useQuery({
    queryKey: ["factoryOrder", id],
    queryFn: () => fetchFactoryOrder(id),
    enabled: isEdit,
  });

  // Fetch category tree for dropdown
  const { data: categoryTree } = useQuery({
    queryKey: ["categoryTree"],
    queryFn: fetchCategoryTree,
    staleTime: 300000, // 5 minutes
  });

  // Get categories and subcategories from tree
  const categories = useMemo(() => {
    if (!categoryTree) return [];
    return categoryTree.map((cat) => ({
      id: cat.id,
      name: cat.name,
      subcategories: cat.subcategories || [],
    }));
  }, [categoryTree]);

  // Get selected category object for product filtering
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory);
  }, [categories, selectedCategory]);

  const subcategories = useMemo(() => {
    return selectedCategoryObj?.subcategories || [];
  }, [selectedCategoryObj]);

  // Get selected subcategory object
  const selectedSubcategoryObj = useMemo(() => {
    return subcategories.find((s) => s.id === selectedSubcategory);
  }, [subcategories, selectedSubcategory]);

  // Fetch products filtered by category/subcategory (use NAME for API)
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: [
      "products",
      selectedCategoryObj?.name,
      selectedSubcategoryObj?.name,
    ],
    queryFn: () =>
      fetchProducts({
        page: 1,
        page_size: 100,
        category: selectedCategoryObj?.name || undefined,
        subcategory: selectedSubcategoryObj?.name || undefined,
      }),
    enabled: Boolean(selectedCategoryObj?.name), // Only fetch when category is selected
  });

  const products = productsData?.items || [];

  // Populate form when editing
  useEffect(() => {
    if (existingOrder) {
      setFormData({
        order_number: existingOrder.order_number || "",
        factory_name: existingOrder.factory_name || "",
        factory_contact: existingOrder.factory_contact || {
          name: "",
          email: "",
          phone: "",
        },
        items: existingOrder.items || [],
        tax_amount: existingOrder.tax_amount || 0,
        shipping_cost: existingOrder.shipping_cost || 0,
        discount_amount: existingOrder.discount_amount || 0,
        currency: existingOrder.currency || "INR",
        expected_delivery_date:
          existingOrder.expected_delivery_date?.split("T")[0] || "",
        payment_terms: existingOrder.payment_terms || "",
        notes: existingOrder.notes || "",
      });
    }
  }, [existingOrder]);

  // Helper to format error messages
  const formatError = (error) => {
    const detail = error.response?.data?.detail;
    if (!detail) return "An error occurred";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // Pydantic validation errors
      return detail
        .map((e) => e.msg || e.message || JSON.stringify(e))
        .join(", ");
    }
    return JSON.stringify(detail);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: createFactoryOrder,
    onSuccess: () => {
      queryClient.invalidateQueries(["factoryOrders"]);
      queryClient.invalidateQueries(["inventorySummary"]);
      toast.success("Factory order created successfully");
      navigate("/stock-management/factory-orders");
    },
    onError: (error) => toast.error(formatError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateFactoryOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["factoryOrders"]);
      queryClient.invalidateQueries(["inventorySummary"]);
      toast.success("Factory order updated successfully");
      navigate("/stock-management/factory-orders");
    },
    onError: (error) => toast.error(formatError(error)),
  });

  const handleAddItem = () => {
    if (!newItem.product_id) {
      toast.error("Please select a product");
      return;
    }

    const product = products.find((p) => p.id === newItem.product_id);
    if (!product) return;

    const item = {
      product_id: newItem.product_id,
      product_name: product.name,
      product_sku: product.sku,
      quantity_ordered: newItem.quantity_ordered,
      unit_price:
        newItem.unit_price || product.cost_price || product.unit_price,
      total_price:
        newItem.quantity_ordered *
        (newItem.unit_price || product.cost_price || product.unit_price),
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({
      product_id: "",
      quantity_ordered: 1,
      unit_price: 0,
    });
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.total_price || item.quantity_ordered * item.unit_price || 0,
        ),
      0,
    );
    const total =
      subtotal +
      Number(formData.tax_amount || 0) +
      Number(formData.shipping_cost || 0) -
      Number(formData.discount_amount || 0);
    return { subtotal, total };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const submitData = {
      ...formData,
      order_number: formData.order_number?.trim() || null, // Let backend auto-generate if empty
      items: formData.items.map((item) => ({
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
      })),
      expected_delivery_date: formData.expected_delivery_date
        ? new Date(formData.expected_delivery_date).toISOString()
        : null,
    };

    if (isEdit) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEdit ? "Edit Factory Order" : "New Factory Order"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? "Update order details"
                : "Create a purchase order to manufacturer"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Factory Details */}
          <Card>
            <CardHeader>
              <CardTitle>Factory Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_number">Order Number (Optional)</Label>
                  <Input
                    id="order_number"
                    value={formData.order_number}
                    onChange={(e) =>
                      setFormData({ ...formData, order_number: e.target.value })
                    }
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <Label htmlFor="factory_name">Factory Name *</Label>
                  <Input
                    id="factory_name"
                    value={formData.factory_name}
                    onChange={(e) =>
                      setFormData({ ...formData, factory_name: e.target.value })
                    }
                    placeholder="Enter factory/manufacturer name"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Person</Label>
                  <Input
                    id="contact_name"
                    value={formData.factory_contact?.name || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        factory_contact: {
                          ...formData.factory_contact,
                          name: e.target.value,
                        },
                      })
                    }
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.factory_contact?.email || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        factory_contact: {
                          ...formData.factory_contact,
                          email: e.target.value,
                        },
                      })
                    }
                    placeholder="email@factory.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.factory_contact?.phone || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        factory_contact: {
                          ...formData.factory_contact,
                          phone: e.target.value,
                        },
                      })
                    }
                    placeholder="+91..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category & Subcategory Selection Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(v) => {
                      setSelectedCategory(v);
                      setSelectedSubcategory("");
                      setNewItem({ ...newItem, product_id: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={selectedSubcategory}
                    onValueChange={(v) => {
                      setSelectedSubcategory(v);
                      setNewItem({ ...newItem, product_id: "" });
                    }}
                    disabled={!selectedCategory || subcategories.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          subcategories.length === 0
                            ? "No subcategories"
                            : "Select subcategory"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Selection Row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Product *</Label>
                  <Select
                    value={newItem.product_id}
                    onValueChange={(v) => {
                      const product = products.find((p) => p.id === v);
                      setNewItem({
                        ...newItem,
                        product_id: v,
                        unit_price:
                          product?.cost_price || product?.unit_price || 0,
                      });
                    }}
                    disabled={!selectedCategory || productsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedCategory
                            ? "Select category first"
                            : productsLoading
                              ? "Loading products..."
                              : products.length === 0
                                ? "No products found"
                                : "Select product"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.quantity_ordered}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        quantity_ordered: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="w-32">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unit_price}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!newItem.product_id}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Items List */}
              {formData.items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Unit Price</th>
                        <th className="text-right p-3">Total</th>
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
                          <td className="p-3 text-right">
                            {item.quantity_ordered}
                          </td>
                          <td className="p-3 text-right">
                            {getCurrencySymbol(formData.currency)}
                            {Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {getCurrencySymbol(formData.currency)}
                            {Number(item.total_price).toFixed(2)}
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
              ) : (
                <div className="text-center p-8 text-muted-foreground border rounded-lg">
                  No items added yet. Select a product above to add items.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Delivery */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="tax_amount">Tax Amount</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tax_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="shipping_cost">Shipping Cost</Label>
                  <Input
                    id="shipping_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.shipping_cost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shipping_cost: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="discount_amount">Discount</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="expected_delivery_date">
                    Expected Delivery
                  </Label>
                  <Input
                    id="expected_delivery_date"
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expected_delivery_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input
                    id="payment_terms"
                    value={formData.payment_terms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_terms: e.target.value,
                      })
                    }
                    placeholder="e.g., Net 30"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) =>
                      setFormData({ ...formData, currency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
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
                  placeholder="Additional notes for the order..."
                  rows={3}
                />
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>
                    {getCurrencySymbol(formData.currency)}
                    {Number(subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>
                    {getCurrencySymbol(formData.currency)}
                    {Number(formData.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span>
                    {getCurrencySymbol(formData.currency)}
                    {Number(formData.shipping_cost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span>
                    -{getCurrencySymbol(formData.currency)}
                    {Number(formData.discount_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>
                    {getCurrencySymbol(formData.currency)}
                    {Number(total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
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
              {isEdit ? "Update Order" : "Create Order"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default FactoryOrderForm;
