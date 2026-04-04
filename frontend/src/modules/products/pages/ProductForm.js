import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  createProduct,
  updateProduct,
  fetchProduct,
  fetchCategoryTree,
  fetchWarehouses,
} from "../api";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { Switch } from "../../../components/ui/switch";

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "",
    subcategory: "",
    description: "",
    unit_of_measure: "",
    unit_price: "",
    cost_price: "",
    currency: "INR",
    stock_quantity: "0",
    min_stock_level: "0",
    max_stock_level: "",
    image_url: "",
    is_active: true,
    warehouse_id: "",
  });

  const [specifications, setSpecifications] = useState([
    { key: "", value: "" },
  ]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageType, setImageType] = useState("upload");

  // Fetch category tree from backend (parents with subcategories)
  const { data: categoryTree = [] } = useQuery({
    queryKey: ["categoryTree"],
    queryFn: fetchCategoryTree,
    staleTime: 60 * 1000,
  });

  // Fetch warehouses for dropdown
  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: fetchWarehouses,
    staleTime: 60 * 1000,
  });
  const warehouses = warehousesData?.items || [];

  // Parent category names for dropdown
  const categories = categoryTree.map((c) => c.name);

  // Get subcategories for the currently selected category
  const selectedCategoryObj = categoryTree.find(
    (c) => c.name === formData.category,
  );
  const subcategories = (selectedCategoryObj?.subcategories || []).map(
    (s) => s.name,
  );

  const units = [
    "Nos",
    "Pcs",
    "Set",
    "Meter",
    "Feet",
    "Box",
    "Roll",
    "Kg",
    "Ltr",
  ];

  const currencies = ["INR", "USD", "EUR", "GBP"];

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (product && isEdit) {
      setFormData({
        sku: product.sku || "",
        name: product.name || "",
        category: product.category || "",
        subcategory: product.subcategory || "",
        description: product.description || "",
        unit_of_measure: product.unit_of_measure || "",
        unit_price: product.unit_price?.toString() || "",
        cost_price: product.cost_price?.toString() || "",
        currency: product.currency || "INR",
        stock_quantity: product.stock_quantity?.toString() || "0",
        min_stock_level: product.min_stock_level?.toString() || "0",
        max_stock_level: product.max_stock_level?.toString() || "",
        image_url:
          product.images && product.images.length > 0 ? product.images[0] : "",
        is_active: product.is_active !== false,
        warehouse_id: product.warehouse_id || "",
      });

      if (
        product.specifications &&
        typeof product.specifications === "object"
      ) {
        const specs = Object.entries(product.specifications).map(
          ([key, value]) => ({ key, value: String(value) }),
        );
        setSpecifications(specs.length > 0 ? specs : [{ key: "", value: "" }]);
      }

      if (product.images && product.images.length > 0) {
        setImagePreview(product.images[0]);
        if (product.images[0].startsWith("http")) {
          setImageType("url");
        } else {
          setImageType("upload");
        }
      }
    }
  }, [product, isEdit]);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product created successfully!");
      navigate("/products");
    },
    onError: (error) => {
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        const msg = errorDetail
          .map((err) => `${err.loc?.join(" > ") || "Field"}: ${err.msg}`)
          .join(", ");
        toast.error(`Validation error: ${msg}`);
      } else {
        toast.error(errorDetail || "Failed to create product");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["product", id]);
      toast.success("Product updated successfully!");
      navigate("/products");
    },
    onError: (error) => {
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        const msg = errorDetail
          .map((err) => `${err.loc?.join(" > ") || "Field"}: ${err.msg}`)
          .join(", ");
        toast.error(`Validation error: ${msg}`);
      } else {
        toast.error(errorDetail || "Failed to update product");
      }
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Reset subcategory when parent category changes
      if (name === "category" && value !== prev.category) {
        updated.subcategory = "";
      }
      return updated;
    });
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData((prev) => ({ ...prev, image_url: url }));
    if (url) setImagePreview(url);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image_url: "" }));
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { key: "", value: "" }]);
  };

  const removeSpecification = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const updateSpecification = (index, field, value) => {
    const updated = [...specifications];
    updated[index][field] = value;
    setSpecifications(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.sku ||
      !formData.name ||
      !formData.category ||
      !formData.unit_of_measure ||
      !formData.unit_price
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const submitData = {
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      unit_of_measure: formData.unit_of_measure,
      unit_price: parseFloat(formData.unit_price),
      currency: formData.currency,
      stock_quantity: parseInt(formData.stock_quantity || "0", 10),
      min_stock_level: parseInt(formData.min_stock_level || "0", 10),
    };

    // Optional fields
    if (formData.description?.trim()) {
      submitData.description = formData.description.trim();
    }
    if (formData.subcategory?.trim()) {
      submitData.subcategory = formData.subcategory.trim();
    }
    if (formData.cost_price) {
      submitData.cost_price = parseFloat(formData.cost_price);
    }
    if (formData.max_stock_level) {
      submitData.max_stock_level = parseInt(formData.max_stock_level, 10);
    }
    
    // is_active and warehouse_id
    submitData.is_active = formData.is_active;
    if (formData.warehouse_id) {
      submitData.warehouse_id = formData.warehouse_id;
    }

    // Specifications
    if (specifications.length > 0) {
      const specsObject = {};
      specifications.forEach((spec) => {
        if (spec.key.trim() && spec.value.trim()) {
          specsObject[spec.key.trim()] = spec.value.trim();
        }
      });
      if (Object.keys(specsObject).length > 0) {
        submitData.specifications = specsObject;
      }
    }

    // Images
    const images = [];
    if (
      imageType === "url" &&
      formData.image_url &&
      formData.image_url.trim()
    ) {
      images.push(formData.image_url.trim());
    }
    if (images.length > 0) {
      submitData.images = images;
    }

    if (isEdit) {
      updateMutation.mutate({ id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isEdit && isLoading) {
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/products")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {isEdit ? "Edit Product" : "Create New Product"}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit
                ? "Update product information"
                : "Add a new product to your catalog"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">Product Code (SKU) *</Label>
                      <Input
                        id="sku"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        placeholder="e.g., CAM001"
                        required
                        disabled={isEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        key={`category-${formData.category}`}
                        value={formData.category}
                        onValueChange={(value) =>
                          handleSelectChange("category", value)
                        }
                        required
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., IP Dome Camera 2MP"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory</Label>
                      {subcategories.length > 0 ? (
                        <Select
                          key={`sub-${formData.category}-${formData.subcategory}`}
                          value={formData.subcategory || "_none_"}
                          onValueChange={(value) =>
                            handleSelectChange(
                              "subcategory",
                              value === "_none_" ? "" : value,
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">None</SelectItem>
                            {subcategories.map((sub) => (
                              <SelectItem key={sub} value={sub}>
                                {sub}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="subcategory"
                          name="subcategory"
                          value={formData.subcategory}
                          onChange={handleInputChange}
                          placeholder={
                            formData.category
                              ? "No subcategories available"
                              : "Select a category first"
                          }
                          disabled={!formData.category}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Product description..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit_of_measure">Unit *</Label>
                      <Select
                        key={`unit-${formData.unit_of_measure}`}
                        value={formData.unit_of_measure}
                        onValueChange={(value) =>
                          handleSelectChange("unit_of_measure", value)
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit_price">Unit Price *</Label>
                      <Input
                        id="unit_price"
                        name="unit_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.unit_price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_price">Cost Price</Label>
                      <Input
                        id="cost_price"
                        name="cost_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) =>
                          handleSelectChange("currency", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((cur) => (
                            <SelectItem key={cur} value={cur}>
                              {cur}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warehouse_id">Warehouse</Label>
                      <Select
                        value={formData.warehouse_id || "_none_"}
                        onValueChange={(value) =>
                          handleSelectChange("warehouse_id", value === "_none_" ? "" : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none_">No Warehouse</SelectItem>
                          {warehouses.map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active">Active Status</Label>
                      <p className="text-xs text-muted-foreground">
                        Inactive products won't appear in stock summary
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Opening Stock</Label>
                      <Input
                        id="stock_quantity"
                        name="stock_quantity"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={handleInputChange}
                        placeholder="0"
                      />
                      {isEdit && (
                        <p className="text-xs text-gray-500">
                          Use stock movements to adjust after creation
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock_level">Min Stock Level</Label>
                      <Input
                        id="min_stock_level"
                        name="min_stock_level"
                        type="number"
                        min="0"
                        value={formData.min_stock_level}
                        onChange={handleInputChange}
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500">
                        Low-stock alert threshold
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_stock_level">Max Stock Level</Label>
                      <Input
                        id="max_stock_level"
                        name="max_stock_level"
                        type="number"
                        min="0"
                        value={formData.max_stock_level}
                        onChange={handleInputChange}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Specifications</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSpecification}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {specifications.map((spec, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Key (e.g., Resolution)"
                        value={spec.key}
                        onChange={(e) =>
                          updateSpecification(index, "key", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value (e.g., 2MP)"
                        value={spec.value}
                        onChange={(e) =>
                          updateSpecification(index, "value", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpecification(index)}
                        disabled={specifications.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: Image + Submit */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Image</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs value={imageType} onValueChange={setImageType}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value="upload"
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger
                        value="url"
                        className="flex items-center gap-2"
                      >
                        <LinkIcon className="h-4 w-4" />
                        URL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="image_file">Upload Image</Label>
                        <Input
                          id="image_file"
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="url" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="image_url">Image URL</Label>
                        <Input
                          id="image_url"
                          name="image_url"
                          value={formData.image_url}
                          onChange={handleImageUrlChange}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-48 object-cover rounded-lg border"
                        onError={() => setImagePreview(null)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stock Summary (Edit only) */}
              {isEdit && product && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Current Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p
                        className={`text-3xl font-bold ${
                          product.stock_quantity <= product.min_stock_level
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}
                      >
                        {product.stock_quantity}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        units in stock
                      </p>
                      {product.stock_quantity <= product.min_stock_level &&
                        product.min_stock_level > 0 && (
                          <p className="text-xs text-amber-600 mt-2">
                            Below minimum level ({product.min_stock_level})
                          </p>
                        )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : isEdit
                    ? "Update Product"
                    : "Create Product"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ProductForm;
