import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  createDemandForecast,
  updateDemandForecast,
  fetchDemandForecast,
} from "../api";
import {
  fetchProducts,
  fetchCategoryTree,
  fetchProduct,
} from "../../products/api";
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
import { Badge } from "../../../components/ui/badge";
import { ArrowLeft, Save, Edit } from "lucide-react";
import { toast } from "sonner";

const DemandForecastForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();

  // Check if editing or viewing
  const isEditMode =
    location.pathname.endsWith("/edit") || location.pathname.endsWith("/new");
  const isViewMode = Boolean(id) && !location.pathname.endsWith("/edit");
  const isCreate = !id;

  const [formData, setFormData] = useState({
    product_id: "",
    forecast_period: "",
    period_start_date: "",
    period_end_date: "",
    forecasted_demand: 0,
    confidence_level: "medium",
    notes: "",
  });

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  // Fetch existing record if viewing or editing
  const { data: existingRecord } = useQuery({
    queryKey: ["demandForecast", id],
    queryFn: () => fetchDemandForecast(id),
    enabled: Boolean(id),
  });

  // Fetch category tree
  const { data: categoryTree = [] } = useQuery({
    queryKey: ["categoryTree"],
    queryFn: fetchCategoryTree,
    staleTime: 60 * 1000,
  });

  const categories = useMemo(
    () => categoryTree.map((c) => c.name),
    [categoryTree],
  );

  const subcategories = useMemo(() => {
    const selectedCategoryObj = categoryTree.find(
      (c) => c.name === selectedCategory,
    );
    return (selectedCategoryObj?.subcategories || []).map((s) => s.name);
  }, [categoryTree, selectedCategory]);

  // Fetch single product when viewing/editing to get category info
  const { data: editProduct } = useQuery({
    queryKey: ["product", existingRecord?.product_id],
    queryFn: () => fetchProduct(existingRecord.product_id),
    enabled: Boolean(id) && !!existingRecord?.product_id,
  });

  // Fetch products filtered by category/subcategory
  const { data: productsData } = useQuery({
    queryKey: ["products", "forecast", selectedCategory, selectedSubcategory],
    queryFn: () =>
      fetchProducts({
        page: 1,
        page_size: 100,
        category: selectedCategory || undefined,
        subcategory: selectedSubcategory || undefined,
      }),
    enabled: !!selectedCategory,
  });

  const products = productsData?.items || [];

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedSubcategory("");
    setFormData((prev) => ({ ...prev, product_id: "" }));
  };

  const handleSubcategoryChange = (value) => {
    setSelectedSubcategory(value);
    setFormData((prev) => ({ ...prev, product_id: "" }));
  };

  // Populate form when viewing/editing
  useEffect(() => {
    if (existingRecord) {
      setFormData({
        product_id: existingRecord.product_id || "",
        forecast_period: existingRecord.forecast_period || "",
        period_start_date: existingRecord.period_start_date
          ? existingRecord.period_start_date.substring(0, 10)
          : "",
        period_end_date: existingRecord.period_end_date
          ? existingRecord.period_end_date.substring(0, 10)
          : "",
        forecasted_demand: existingRecord.forecasted_demand || 0,
        confidence_level: existingRecord.confidence_level || "medium",
        notes: existingRecord.notes || "",
      });
      // Set category from existingRecord immediately (faster than waiting for editProduct)
      if (existingRecord.product_category) {
        setSelectedCategory(existingRecord.product_category);
      }
    }
  }, [existingRecord]);

  // Set subcategory when product data is loaded (not available in forecast response)
  useEffect(() => {
    if (editProduct) {
      // Also update category from product in case forecast didn't have it
      if (editProduct.category && !selectedCategory) {
        setSelectedCategory(editProduct.category);
      }
      setSelectedSubcategory(editProduct.subcategory || "");
    }
  }, [editProduct, selectedCategory]);

  // Auto-fill period dates (only for new forecasts)
  useEffect(() => {
    if (formData.forecast_period && isCreate) {
      const [year, month] = formData.forecast_period.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      const fmt = (d) => d.toISOString().substring(0, 10);
      setFormData((prev) => ({
        ...prev,
        period_start_date: fmt(start),
        period_end_date: fmt(end),
      }));
    }
  }, [formData.forecast_period, isCreate]);

  const createMutation = useMutation({
    mutationFn: createDemandForecast,
    onSuccess: () => {
      queryClient.invalidateQueries(["demandForecasts"]);
      toast.success("Forecast created successfully");
      navigate("/stock-management/demand-forecasts");
    },
    onError: (error) =>
      toast.error(error.response?.data?.detail || "Failed to create forecast"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateDemandForecast(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["demandForecasts"]);
      toast.success("Forecast updated successfully");
      navigate("/stock-management/demand-forecasts");
    },
    onError: (error) =>
      toast.error(error.response?.data?.detail || "Failed to update forecast"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.product_id) {
      toast.error("Please select a product");
      return;
    }
    if (!formData.forecast_period) {
      toast.error("Please select a forecast period");
      return;
    }
    if (!formData.period_start_date || !formData.period_end_date) {
      toast.error("Please enter period start and end dates");
      return;
    }
    if (formData.forecasted_demand <= 0) {
      toast.error("Forecasted demand must be greater than zero");
      return;
    }

    const submitData = {
      ...formData,
      period_start_date: new Date(formData.period_start_date).toISOString(),
      period_end_date: new Date(formData.period_end_date).toISOString(),
    };

    if (isEditMode && id) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const periodOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    periodOptions.push({ value, label });
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              {isViewMode
                ? "Forecast Details"
                : id
                  ? "Edit Forecast"
                  : "New Demand Forecast"}
            </h1>
            <p className="text-muted-foreground">
              {isViewMode
                ? "View forecast details"
                : id
                  ? "Update forecast details"
                  : "Create demand forecast for inventory planning"}
            </p>
          </div>
          {isViewMode && (
            <Button
              onClick={() =>
                navigate(`/stock-management/demand-forecasts/${id}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Forecast Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={selectedSubcategory}
                    onValueChange={handleSubcategoryChange}
                    disabled={isViewMode || !selectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedCategory ? "Select" : "Select category first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubcategory &&
                        !subcategories.includes(selectedSubcategory) && (
                          <SelectItem value={selectedSubcategory}>
                            {selectedSubcategory}
                          </SelectItem>
                        )}
                      {subcategories.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Product *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, product_id: v })
                    }
                    disabled={isViewMode || !selectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedCategory
                            ? "Select product"
                            : "Select category first"
                        }
                      >
                        {formData.product_id && (
                          <>
                            {products.find((p) => p.id === formData.product_id)
                              ?.name ||
                              editProduct?.name ||
                              existingRecord?.product_name ||
                              "Loading..."}{" "}
                            (
                            {products.find((p) => p.id === formData.product_id)
                              ?.sku ||
                              editProduct?.sku ||
                              existingRecord?.product_sku ||
                              ""}
                            )
                          </>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {formData.product_id &&
                        !products.find((p) => p.id === formData.product_id) && (
                          <SelectItem value={formData.product_id}>
                            {editProduct?.name ||
                              existingRecord?.product_name ||
                              "Loading..."}{" "}
                            (
                            {editProduct?.sku ||
                              existingRecord?.product_sku ||
                              ""}
                            )
                          </SelectItem>
                        )}
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Forecast Period *</Label>
                  <Select
                    value={formData.forecast_period}
                    onValueChange={(v) =>
                      setFormData({ ...formData, forecast_period: v })
                    }
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.period_start_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period_start_date: e.target.value,
                      })
                    }
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.period_end_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        period_end_date: e.target.value,
                      })
                    }
                    disabled={isViewMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forecasted Demand *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.forecasted_demand}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        forecasted_demand: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={isViewMode}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected units needed
                  </p>
                </div>
                <div>
                  <Label>Confidence Level</Label>
                  <Select
                    value={formData.confidence_level}
                    onValueChange={(v) =>
                      setFormData({ ...formData, confidence_level: v })
                    }
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any assumptions or notes..."
                  rows={2}
                  disabled={isViewMode}
                />
              </div>
            </CardContent>
          </Card>

          {!isViewMode && (
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
                {id ? "Update Forecast" : "Create Forecast"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
};

export default DemandForecastForm;
