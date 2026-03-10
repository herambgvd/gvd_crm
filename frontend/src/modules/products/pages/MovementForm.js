import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchStockMovement,
  createStockMovement,
  updateStockMovement,
  fetchAllMovementCategories,
  fetchCategoryTree,
  fetchProducts,
} from "../api";
import { fetchEntities } from "../../entities/api";
import { fetchUsers } from "../../settings/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MovementForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    category_id: "",
    entity_id: "",
    assigned_user_ids: [],
    location_from: "",
    location_to: "",
    request_date: new Date().toISOString().split("T")[0],
    uid: "",
    product_category_id: "",
    product_subcategory_id: "",
    product_id: "",
    quantity: 1,
    notes: "",
  });

  // Fetch movement if editing
  const { data: movement, isLoading: movementLoading } = useQuery({
    queryKey: ["stockMovement", id],
    queryFn: () => fetchStockMovement(id),
    enabled: isEdit,
  });

  // Fetch all dependencies
  const { data: movementCategories = [] } = useQuery({
    queryKey: ["movementCategoriesAll"],
    queryFn: fetchAllMovementCategories,
  });

  const { data: categoryTree = [] } = useQuery({
    queryKey: ["categoryTree"],
    queryFn: fetchCategoryTree,
  });

  const { data: entitiesData } = useQuery({
    queryKey: ["entities"],
    queryFn: () => fetchEntities({ page_size: 100 }),
  });
  const entities = entitiesData?.items || [];

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
  const users = usersData || [];

  // Get subcategories for selected category
  const selectedCategory = categoryTree.find(
    (c) => c.id === formData.product_category_id,
  );
  const subcategories = selectedCategory?.subcategories || [];

  // Get selected subcategory for querying products
  const selectedSubcategory = subcategories.find(
    (s) => s.id === formData.product_subcategory_id,
  );

  // Get category and subcategory names for product filtering
  // Products store category/subcategory as NAME strings, not IDs
  const categoryNameForFilter = selectedCategory?.name;
  const subcategoryNameForFilter = selectedSubcategory?.name;

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: [
      "products-for-movement",
      categoryNameForFilter,
      subcategoryNameForFilter,
    ],
    queryFn: () =>
      fetchProducts({
        page_size: 100,
        category: categoryNameForFilter || undefined,
        subcategory: subcategoryNameForFilter || undefined,
      }),
  });
  const products = productsData?.items || [];

  // Populate form for editing
  useEffect(() => {
    if (movement) {
      setFormData({
        category_id: movement.category_id || "",
        entity_id: movement.entity_id || "",
        assigned_user_ids: movement.assigned_user_ids || [],
        location_from: movement.location_from || "",
        location_to: movement.location_to || "",
        request_date: movement.request_date
          ? new Date(movement.request_date).toISOString().split("T")[0]
          : "",
        uid: movement.uid || "",
        product_category_id: movement.product_category_id || "",
        product_subcategory_id: movement.product_subcategory_id || "",
        product_id: movement.product_id || "",
        quantity: movement.quantity || 1,
        notes: movement.notes || "",
      });
    }
  }, [movement]);

  const createMutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: (data) => {
      queryClient.invalidateQueries(["stockMovements"]);
      toast.success("Stock movement created successfully!");
      navigate(`/inventory/movements/${data.id}`);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create stock movement",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateStockMovement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["stockMovements"]);
      queryClient.invalidateQueries(["stockMovement", id]);
      toast.success("Stock movement updated successfully!");
      navigate(`/inventory/movements/${id}`);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update stock movement",
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.category_id) {
      toast.error("Please select a movement category");
      return;
    }
    if (!formData.product_id) {
      toast.error("Please select a product");
      return;
    }
    if (!formData.quantity || formData.quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const payload = {
      ...formData,
      quantity: parseInt(formData.quantity, 10),
      request_date: formData.request_date
        ? new Date(formData.request_date).toISOString()
        : null,
      entity_id: formData.entity_id || null,
      product_category_id: formData.product_category_id || null,
      product_subcategory_id: formData.product_subcategory_id || null,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleUserToggle = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assigned_user_ids: prev.assigned_user_ids.includes(userId)
        ? prev.assigned_user_ids.filter((id) => id !== userId)
        : [...prev.assigned_user_ids, userId],
    }));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && movementLoading) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/inventory/movements")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEdit ? "Edit Movement" : "New Stock Movement"}
            </h1>
            <p className="text-gray-600">
              {isEdit
                ? "Update stock movement details"
                : "Create a new inventory movement"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Movement Type & Entity */}
            <Card>
              <CardHeader>
                <CardTitle>Movement Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category_id">Movement Category *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, category_id: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {movementCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            [{cat.code}] {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="entity_id">Entity (Customer/Vendor)</Label>
                    <Select
                      value={formData.entity_id || "__none__"}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          entity_id: val === "__none__" ? "" : val,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {entities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.company_name || entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="uid">Reference/UID</Label>
                    <Input
                      id="uid"
                      value={formData.uid}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          uid: e.target.value,
                        }))
                      }
                      placeholder="Auto-generated if empty"
                    />
                  </div>

                  <div>
                    <Label htmlFor="request_date">Request Date</Label>
                    <Input
                      id="request_date"
                      type="date"
                      value={formData.request_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          request_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location_from">From Location</Label>
                    <Input
                      id="location_from"
                      value={formData.location_from}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location_from: e.target.value,
                        }))
                      }
                      placeholder="e.g. Main Warehouse"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location_to">To Location</Label>
                    <Input
                      id="location_to"
                      value={formData.location_to}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location_to: e.target.value,
                        }))
                      }
                      placeholder="e.g. Client Site"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Product Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="product_category_id">
                      Product Category
                    </Label>
                    <Select
                      value={formData.product_category_id || "__all__"}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          product_category_id: val === "__all__" ? "" : val,
                          product_subcategory_id: "",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Categories</SelectItem>
                        {categoryTree.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="product_subcategory_id">Subcategory</Label>
                    <Select
                      value={formData.product_subcategory_id || "__all__"}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          product_subcategory_id: val === "__all__" ? "" : val,
                        }))
                      }
                      disabled={!subcategories.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">
                          All Subcategories
                        </SelectItem>
                        {subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="product_id">Product *</Label>
                    <Select
                      value={formData.product_id || "__select__"}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          product_id: val === "__select__" ? "" : val,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            productsLoading
                              ? "Loading..."
                              : products.length === 0
                                ? "No products available"
                                : "Select product"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {products.length === 0 ? (
                          <SelectItem value="__select__" disabled>
                            No products found
                          </SelectItem>
                        ) : (
                          products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.sku}) - Stock:{" "}
                              {product.stock_quantity}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assigned Users */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Assigned Users ({formData.assigned_user_ids.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading users...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={formData.assigned_user_ids.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                        />
                        <label
                          htmlFor={`user-${user.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {user.name || `${user.first_name} ${user.last_name}`}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Any additional information about this movement..."
                  rows={5}
                />
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/inventory/movements")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEdit ? "Update Movement" : "Create Movement"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default MovementForm;
