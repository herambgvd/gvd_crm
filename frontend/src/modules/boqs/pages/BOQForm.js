import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { createBOQ, updateBOQ, fetchBOQ } from "../api";
import { fetchProducts, fetchAllCategories } from "../../products/api";
import { fetchLead, fetchLeadInvolvements } from "../../leads/api";
import { fetchDefaultTemplate } from "../../settings/api";
import { fetchEntity } from "../../entities/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Eye,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// BOQ Template Preview Component
const BOQTemplatePreview = ({ boqData, template }) => {
  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

  if (!template) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No BOQ Template Configured
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Configure a default BOQ template in Settings → Templates to see a
              proper preview
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.open("/settings/templates", "_blank")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configure Template
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="bg-white h-full overflow-y-auto print:p-0 print:shadow-none">
          {/* Header */}
          <div className="mb-8">
            {template.header_image_url ? (
              <div className="w-full mb-6 flex-shrink-0">
                <img
                  src={`${BACKEND_URL}${template.header_image_url}`}
                  alt="Company Header"
                  className="w-full object-contain"
                  style={{ display: "block" }}
                />
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900">
                  {template.company_name || "Your Company Name"}
                </h1>
                {template.company_address && (
                  <p className="text-sm text-gray-600 mt-2">
                    {template.company_address}
                  </p>
                )}
              </div>
            )}

            <div className="px-8">
              <div className="flex justify-between items-center border-b-2 border-gray-200 pb-4">
                <div>{/* BOQ number removed from here */}</div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Date: {new Date().toLocaleDateString()}
                  </p>
                  {boqData.boq_number && (
                    <p className="text-sm text-gray-600 mt-1">
                      {boqData.boq_number}
                    </p>
                  )}
                </div>
              </div>

              {/* From/To Section */}
              {(boqData.from_data || boqData.to_data) && (
                <div className="grid grid-cols-2 gap-8 mt-6 mb-6">
                  {/* From Section */}
                  {boqData.from_data &&
                    Object.keys(boqData.from_data).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">
                          FROM:
                        </h3>
                        <div className="text-sm text-gray-700 space-y-1">
                          {boqData.from_data.company_name && (
                            <p className="font-semibold">
                              {boqData.from_data.company_name}
                            </p>
                          )}
                          {boqData.from_data.address && (
                            <p>{boqData.from_data.address}</p>
                          )}
                          {boqData.from_data.phone && (
                            <p>Phone: {boqData.from_data.phone}</p>
                          )}
                          {boqData.from_data.email && (
                            <p>Email: {boqData.from_data.email}</p>
                          )}
                          {boqData.from_data.website && (
                            <p>Website: {boqData.from_data.website}</p>
                          )}
                          {boqData.from_data.gst && (
                            <p>GST: {boqData.from_data.gst}</p>
                          )}
                        </div>
                      </div>
                    )}

                  {/* To Section */}
                  {boqData.to_data &&
                    Object.keys(boqData.to_data).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">
                          TO:
                        </h3>
                        <div className="text-sm text-gray-700 space-y-1">
                          {boqData.to_data.company_name && (
                            <p className="font-semibold">
                              {boqData.to_data.company_name}
                            </p>
                          )}
                          {boqData.to_data.address && (
                            <p>{boqData.to_data.address}</p>
                          )}
                          {boqData.to_data.phone && (
                            <p>Phone: {boqData.to_data.phone}</p>
                          )}
                          {boqData.to_data.email && (
                            <p>Email: {boqData.to_data.email}</p>
                          )}
                          {boqData.to_data.gst && (
                            <p>GST: {boqData.to_data.gst}</p>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8 mb-8 flex-1 min-h-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                      S.No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                      Qty/Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boqData.items && boqData.items.length > 0 ? (
                    boqData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 border w-1/6">
                          <p className="text-sm font-medium text-gray-900">
                            {item.item_name || "Unnamed Item"}
                          </p>
                          {item.product_code && item.product_code !== item.item_name && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.product_code}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 border w-2/5">
                          <div>
                            {item.description && item.description !== item.item_name && (
                              <p className="text-xs text-gray-600 mb-2">
                                {item.description}
                              </p>
                            )}
                            {item.specifications &&
                              item.specifications.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.specifications.map(
                                    (spec, specIndex) => (
                                      <span
                                        key={specIndex}
                                        className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                                      >
                                        {spec}
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center border">
                          {item.quantity || 0} {item.unit || "Nos"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right border">
                          {formatCurrency(item.price || item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right border">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-8 text-center text-gray-500 border"
                      >
                        No items added to BOQ yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="px-8 flex justify-end mb-8">
            <div className="w-64">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(boqData.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">
                    Tax ({boqData.tax_percentage || 0}%):
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(boqData.tax_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 pt-3 border-t-2">
                  <span className="text-lg font-bold text-gray-900">
                    Total:
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(boqData.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          {template.terms_and_conditions && (
            <div className="px-8 mb-6">
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Terms & Conditions:
                </h3>
                <div className="text-sm text-gray-600 space-y-2">
                  {template.terms_and_conditions
                    .split("\n")
                    .map((term, index) => (
                      <p key={index}>{term}</p>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {template.footer_image_url ? (
            <div className="w-full mt-8 flex-shrink-0">
              <img
                src={`${BACKEND_URL}${template.footer_image_url}`}
                alt="Company Footer"
                className="w-full object-contain"
                style={{ display: "block" }}
              />
            </div>
          ) : template.company_phone || template.company_email ? (
            <div className="bg-gray-50 p-6 mt-8 text-center text-sm text-gray-600">
              <div className="flex justify-center space-x-8">
                {template.company_phone && (
                  <p className="flex items-center">
                    <span className="font-semibold">Phone:</span>{" "}
                    <span className="ml-1">{template.company_phone}</span>
                  </p>
                )}
                {template.company_email && (
                  <p className="flex items-center">
                    <span className="font-semibold">Email:</span>{" "}
                    <span className="ml-1">{template.company_email}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 mt-8 text-center text-sm text-gray-600">
              <p>Thank you for your business!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const BOQForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const leadIdFromUrl = searchParams.get("lead_id");
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    lead_id: leadIdFromUrl || "",
    channel: "direct", // Default channel
    involvement_id: "",
    boq_number: "",
    from_data: {},
    to_data: {},
    items: [],
    tax_percentage: 0,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  const [derivedLeadId, setDerivedLeadId] = useState(leadIdFromUrl); // Track derived lead ID

  const [currentItem, setCurrentItem] = useState({
    product_id: "",
    product_code: "",
    item_name: "",
    description: "",
    specifications: [],
    quantity: 1,
    unit: "",
    unit_price: 0,
    price: 0,
    percentage: 0,
    total_price: 0,
  });

  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingItem, setEditingItem] = useState({
    product_code: "",
    item_name: "",
    description: "",
    specifications: [],
    quantity: 1,
    unit: "",
    unit_price: 0,
    price: 0,
    percentage: 0,
    total_price: 0,
  });

  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchValue, setProductSearchValue] = useState("");

  const { data: productsData } = useQuery({
    queryKey: ["products", "dropdown"],
    queryFn: () => fetchProducts({ page_size: 500 }),
  });
  const products = productsData?.items || [];

  // Fetch all categories from the dedicated API
  const { data: allCategoriesData } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: fetchAllCategories,
  });
  const allCategories = allCategoriesData || [];

  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState("");

  // Top-level categories (no parent)
  const topCategories = React.useMemo(
    () => allCategories.filter((c) => !c.parent_category_id && c.is_active !== false),
    [allCategories]
  );

  // Subcategories of the selected top-level category
  const subCategories = React.useMemo(() => {
    if (!selectedCategoryName) return [];
    const parent = topCategories.find((c) => c.name === selectedCategoryName);
    if (!parent) return [];
    return allCategories.filter(
      (c) => c.parent_category_id === parent.id && c.is_active !== false
    );
  }, [allCategories, topCategories, selectedCategoryName]);

  // Strict dependent filtering:
  // - No category selected → no products shown
  // - Category selected, no subcategory → products matching that category
  // - Category + subcategory selected → only products matching that exact subcategory
  const filteredProducts = React.useMemo(() => {
    if (!selectedCategoryName) return [];
    let result = products.filter((p) => p.category === selectedCategoryName);
    if (selectedSubcategoryName)
      result = result.filter((p) => p.subcategory === selectedSubcategoryName);
    return result;
  }, [products, selectedCategoryName, selectedSubcategoryName]);

  const { data: lead } = useQuery({
    queryKey: ["lead", derivedLeadId],
    queryFn: () => fetchLead(derivedLeadId),
    enabled: !!derivedLeadId,
  });

  const { data: leadInvolvements } = useQuery({
    queryKey: ["leadInvolvements", derivedLeadId],
    queryFn: async () => {
      try {
        const involvements = await fetchLeadInvolvements(derivedLeadId);

        // Fetch entity details for each involvement
        const involvementsWithEntities = await Promise.all(
          involvements.map(async (involvement) => {
            try {
              const entity = await fetchEntity(involvement.entity_id);

              return {
                ...involvement,
                entity_name:
                  entity.company_name ||
                  entity.name ||
                  entity.entity_name ||
                  `Entity ${involvement.entity_id}`,
                entity_data: entity, // Store full entity data for later use
              };
            } catch (error) {
              console.error(
                `Failed to fetch entity ${involvement.entity_id}:`,
                error,
              );
              return {
                ...involvement,
                entity_name: `Entity ${involvement.entity_id}`,
                entity_data: null,
              };
            }
          }),
        );

        return involvementsWithEntities;
      } catch (error) {
        console.error("Error fetching lead involvements:", error);
        return [];
      }
    },
    enabled: !!formData.lead_id,
  });

  const { data: boq, isLoading: isLoadingBOQ } = useQuery({
    queryKey: ["boq", id],
    queryFn: () => fetchBOQ(id),
    enabled: isEdit,
  });

  const { data: boqTemplate } = useQuery({
    queryKey: ["defaultTemplate", "boq"],
    queryFn: () => fetchDefaultTemplate("boq"),
    retry: false, // Don't retry if no template exists
  });

  useEffect(() => {
    if (boq && products && products.length > 0) {
      // Enhance BOQ items with product details
      const enhancedItems = boq.items.map((item, index) => {
        // Find the corresponding product by matching various fields
        const matchingProduct = products.find((p) => {
          // First try exact matches
          if (item.product_id && p.id === item.product_id) return true;
          if (item.product_code && p.product_code === item.product_code)
            return true;

          // Then try name matching (case insensitive)
          if (item.item_name && p.product_name) {
            const itemName = item.item_name.toLowerCase().trim();
            const productName = p.product_name.toLowerCase().trim();

            // Exact match
            if (itemName === productName) return true;

            // Partial match (item name contains product name or vice versa)
            if (
              itemName.includes(productName) ||
              productName.includes(itemName)
            )
              return true;
          }

          return false;
        });

        // Merge item data with product data
        const enhancedItem = {
          ...item,
          product_id: item.product_id || matchingProduct?.id || "",
          product_code:
            item.product_code || matchingProduct?.product_code || "N/A",
          item_name: item.item_name || matchingProduct?.product_name || "",
          description: item.description || matchingProduct?.description || "",
          specifications: (() => {
            // Handle specifications from item first, then product
            if (
              item.specifications &&
              Array.isArray(item.specifications) &&
              item.specifications.length > 0
            ) {
              return item.specifications;
            }
            if (
              item.specifications &&
              typeof item.specifications === "string" &&
              item.specifications.trim()
            ) {
              return item.specifications
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s);
            }
            if (matchingProduct?.specifications) {
              if (typeof matchingProduct.specifications === "string") {
                return matchingProduct.specifications
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
              } else if (Array.isArray(matchingProduct.specifications)) {
                return matchingProduct.specifications.filter(
                  (s) => s && s.trim(),
                );
              } else if (typeof matchingProduct.specifications === "object") {
                // Convert object to array of "key: value" strings
                return Object.entries(matchingProduct.specifications)
                  .map(([key, value]) => `${key}: ${value}`)
                  .filter((s) => s && s.trim());
              }
            }
            return [];
          })(),
          quantity: item.quantity || 1,
          unit: item.unit || matchingProduct?.unit || "",
          unit_price: item.unit_price || matchingProduct?.unit_price || 0,
          // Always prefer saved price, but handle cases where backend incorrectly resets to 0
          price: (() => {
            if (item.hasOwnProperty("price")) {
              // If price exists but is 0, try to recover from total_price
              if (
                item.price === 0 &&
                item.total_price &&
                item.quantity &&
                item.quantity > 0
              ) {
                const calculatedPriceFromTotal =
                  item.total_price / item.quantity;
                const unitPrice =
                  item.unit_price || matchingProduct?.unit_price || 0;

                // If calculated price from total is significantly different from unit price, use it
                if (Math.abs(calculatedPriceFromTotal - unitPrice) > 0.01) {
                  return calculatedPriceFromTotal;
                }
              }

              // If price is still 0 and we have a negative percentage, something is wrong
              if (
                item.price === 0 &&
                item.percentage &&
                item.percentage < -50
              ) {
                const unitPrice =
                  item.unit_price || matchingProduct?.unit_price || 0;
                return unitPrice;
              }

              return item.price;
            }

            const fallbackPrice =
              item.unit_price || matchingProduct?.unit_price || 0;
            return fallbackPrice;
          })(),
          // Calculate percentage properly with correction logic
          percentage: (() => {
            const finalPrice = (() => {
              if (item.hasOwnProperty("price")) {
                if (
                  item.price === 0 &&
                  item.total_price &&
                  item.quantity &&
                  item.quantity > 0
                ) {
                  return item.total_price / item.quantity;
                }
                if (
                  item.price === 0 &&
                  item.percentage &&
                  item.percentage < -50
                ) {
                  return item.unit_price || matchingProduct?.unit_price || 0;
                }
                return item.price;
              }
              return item.unit_price || matchingProduct?.unit_price || 0;
            })();

            const unitPrice =
              item.unit_price || matchingProduct?.unit_price || 0;

            if (
              item.hasOwnProperty("percentage") &&
              item.percentage !== -100 &&
              item.percentage > -50
            ) {
              return item.percentage;
            }

            // Calculate percentage from prices
            if (unitPrice > 0 && finalPrice !== unitPrice) {
              const calculatedPercentage =
                Math.round(((finalPrice - unitPrice) / unitPrice) * 100 * 100) /
                100;
              return calculatedPercentage;
            }

            return 0;
          })(),
          total_price: (() => {
            // For total_price, we can trust the original value if it exists and makes sense
            if (item.total_price) {
              return item.total_price;
            }

            // Otherwise calculate from corrected price
            const correctedPrice = (() => {
              if (item.hasOwnProperty("price")) {
                if (
                  item.price === 0 &&
                  item.total_price &&
                  item.quantity &&
                  item.quantity > 0
                ) {
                  return item.total_price / item.quantity;
                }
                if (
                  item.price === 0 &&
                  item.percentage &&
                  item.percentage < -50
                ) {
                  return item.unit_price || matchingProduct?.unit_price || 0;
                }
                return item.price;
              }
              return item.unit_price || matchingProduct?.unit_price || 0;
            })();

            return item.quantity * correctedPrice;
          })(),
        };

        return enhancedItem;
      });

      setFormData({
        lead_id: boq.lead_id,
        channel: boq.channel,
        involvement_id: boq.involvement_id || "",
        boq_number: boq.boq_number || "",
        from_data: boq.from_data || {},
        to_data: boq.to_data || {},
        items: enhancedItems,
        tax_percentage: boq.tax_percentage || 0,
        subtotal: boq.subtotal || 0,
        tax_amount: boq.tax_amount || 0,
        total_amount: boq.total_amount,
      });

      // Set derived lead ID from BOQ data if not already set
      if (!leadIdFromUrl && boq.lead_id) {
        setDerivedLeadId(boq.lead_id);
      }

      // Force re-render of involvement selection if needed
      if (boq.involvement_id && leadInvolvements) {
        const selectedInvolvement = leadInvolvements.find(
          (inv) => inv.id === boq.involvement_id,
        );
      }
    }
  }, [boq?.id, products?.length]); // Fixed dependency array

  useEffect(() => {
    if (lead && !isEdit) {
      setFormData((prev) => ({ ...prev, channel: lead.channel }));
    }
  }, [lead, isEdit]);

  // Auto-populate from_data from default template (new BOQ, or edit BOQ where from_data is empty)
  useEffect(() => {
    if (!boqTemplate) return;
    setFormData((prev) => {
      const isEmpty = !prev.from_data || Object.values(prev.from_data).every((v) => !v);
      if (!isEmpty) return prev; // already has data, don't overwrite
      const fromData = {
        company_name: boqTemplate.company_name || "",
        address: boqTemplate.company_address || "",
        phone: boqTemplate.company_phone || "",
        email: boqTemplate.company_email || "",
        website: boqTemplate.company_website || "",
        gst: boqTemplate.company_gst || "",
      };
      if (!Object.values(fromData).some((v) => v)) return prev;
      return { ...prev, from_data: fromData };
    });
  }, [boqTemplate]);

  const createMutation = useMutation({
    mutationFn: createBOQ,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boqs"] });
      queryClient.invalidateQueries({ queryKey: ["lead", derivedLeadId] });
      toast.success("BOQ created successfully!");
      navigate(`/leads/${derivedLeadId}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create BOQ");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateBOQ(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boqs"] });
      queryClient.invalidateQueries({ queryKey: ["lead", derivedLeadId] });
      toast.success("BOQ updated successfully!");
      navigate(`/leads/${derivedLeadId}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update BOQ");
    },
  });

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      // Handle specifications safely - it could be string, array, object or null/undefined
      let specifications = [];
      if (product.specifications) {
        if (typeof product.specifications === "string") {
          // If it's a string, split it
          specifications = product.specifications
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);
        } else if (Array.isArray(product.specifications)) {
          // If it's already an array, use it directly
          specifications = product.specifications.filter((s) => s && s.trim());
        } else if (typeof product.specifications === "object") {
          // Convert object to array of "key: value" strings
          specifications = Object.entries(product.specifications)
            .map(([key, value]) => `${key}: ${value}`)
            .filter((s) => s && s.trim());
        }
      }

      setCurrentItem({
        product_id: product.id,
        product_code: product.product_code || "",
        item_name: product.product_name,
        description: product.description || "",
        specifications: specifications,
        quantity: 1,
        unit: product.unit,
        unit_price: product.unit_price,
        price: product.unit_price, // Initialize price with unit_price
        percentage: 0, // Initial percentage is 0
        total_price: product.unit_price,
      });
      setProductSearchOpen(false);
      setProductSearchValue(
        `${product.product_code} - ${product.product_name}`,
      );
    }
  };

  // Calculate percentage markup from unit_price to price
  const calculatePercentage = (unitPrice, price) => {
    if (unitPrice <= 0) return 0;
    return ((price - unitPrice) / unitPrice) * 100;
  };

  // Update current item when price or quantity changes
  const updateCurrentItemCalculations = (item) => {
    const percentage = calculatePercentage(item.unit_price, item.price);
    const totalPrice = item.price * item.quantity;
    const result = {
      ...item,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      total_price: totalPrice,
    };

    return result;
  };

  // Update editing item when price or quantity changes
  const updateEditingItemCalculations = (item) => {
    const percentage = calculatePercentage(item.unit_price, item.price);
    const totalPrice = item.price * item.quantity;
    const result = {
      ...item,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      total_price: totalPrice,
    };

    return result;
  };

  const calculateTotals = (items, taxPercentage) => {
    const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const addItem = () => {
    if (!currentItem.item_name) {
      toast.error("Please select a product");
      return;
    }

    const finalItem = updateCurrentItemCalculations(currentItem);
    const newItems = [...formData.items, finalItem];
    const { subtotal, taxAmount, totalAmount } = calculateTotals(
      newItems,
      formData.tax_percentage,
    );

    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    });

    setCurrentItem({
      product_id: "",
      product_code: "",
      item_name: "",
      description: "",
      specifications: [],
      quantity: 1,
      unit: "",
      unit_price: 0,
      price: 0,
      percentage: 0,
      total_price: 0,
    });

    // Reset search value
    setProductSearchValue("");
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const { subtotal, taxAmount, totalAmount } = calculateTotals(
      newItems,
      formData.tax_percentage,
    );
    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    });
  };

  const handleTaxChange = (taxPercentage) => {
    const { subtotal, taxAmount, totalAmount } = calculateTotals(
      formData.items,
      taxPercentage,
    );
    setFormData({
      ...formData,
      tax_percentage: taxPercentage,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    });
  };

  const handleEditItem = (index) => {
    const item = formData.items[index];

    setEditingItemIndex(index);
    const editingItemData = {
      product_code: item.product_code || "",
      item_name: item.item_name,
      description: item.description || "",
      specifications: item.specifications || [],
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      price: item.price !== undefined ? item.price : item.unit_price, // Preserve exact price value
      percentage: item.percentage || 0,
      total_price: item.total_price,
    };

    setEditingItem(editingItemData);
  };

  const handleSaveItem = () => {
    const updatedItem = updateEditingItemCalculations(editingItem);

    const newItems = [...formData.items];
    newItems[editingItemIndex] = updatedItem;

    const { subtotal, taxAmount, totalAmount } = calculateTotals(
      newItems,
      formData.tax_percentage,
    );

    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    });

    setEditingItemIndex(null);
    setEditingItem({
      product_code: "",
      item_name: "",
      description: "",
      specifications: [],
      quantity: 1,
      unit: "",
      unit_price: 0,
      price: 0,
      percentage: 0,
      total_price: 0,
    });
  };

  const handleCancelEdit = () => {
    setEditingItemIndex(null);
    setEditingItem({
      product_code: "",
      item_name: "",
      description: "",
      specifications: [],
      quantity: 1,
      unit: "",
      unit_price: 0,
      price: 0,
      percentage: 0,
      total_price: 0,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (!formData.lead_id) {
      toast.error("Lead ID is missing. Please go back and try again.");
      return;
    }

    if (!formData.channel) {
      toast.error("Please select a channel");
      return;
    }

    // Ensure all items have required fields including price
    const processedItems = formData.items.map((item, index) => {
      const processedItem = {
        ...item,
        // Only set price to unit_price if price is not set or undefined, preserve 0 values
        price: item.price !== undefined ? item.price : item.unit_price || 0,
        percentage: item.percentage || 0,
        total_price:
          item.total_price ||
          item.quantity *
            (item.price !== undefined ? item.price : item.unit_price || 0),
      };

      return processedItem;
    });

    if (isEdit) {
      // Prepare update data
      const updateData = {
        lead_id: formData.lead_id,
        channel: formData.channel,
        involvement_id: formData.involvement_id || null,
        from_data: formData.from_data,
        to_data: formData.to_data,
        items: processedItems,
        tax_percentage: formData.tax_percentage,
      };
      updateMutation.mutate(updateData);
    } else {
      const createData = {
        lead_id: formData.lead_id,
        channel: formData.channel,
        involvement_id: formData.involvement_id || null,
        from_data: formData.from_data,
        to_data: formData.to_data,
        items: processedItems,
        tax_percentage: formData.tax_percentage,
      };
      createMutation.mutate(createData);
    }
  };

  if (isLoadingBOQ) {
    return (
      <Layout sidebarCollapsed={true}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout sidebarCollapsed={true}>
      <div className="flex gap-4 h-full">
        {/* Main Form */}
        <div className="w-1/2">
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => {
                if (derivedLeadId) {
                  navigate(`/leads/${derivedLeadId}`);
                } else {
                  navigate("/boqs");
                }
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {derivedLeadId ? "Back to Lead" : "Back to BOQs"}
            </Button>

            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl font-heading">
                  {isEdit ? "Edit BOQ" : "Create New BOQ"}
                </CardTitle>
                {lead && (
                  <p className="text-sm text-gray-600">
                    For:{" "}
                    {formData.involvement_id && leadInvolvements
                      ? leadInvolvements.find((inv) => inv.id === formData.involvement_id)?.entity_name || lead.company || lead.contact_name
                      : lead.company || lead.contact_name}
                    {lead.project_name && (
                      <span className="ml-2 font-semibold">
                        | Project: {lead.project_name}
                      </span>
                    )}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  data-testid="boq-form"
                >
                  {/* Lead Involvement Selection */}
                  <div className="border rounded-md p-4 space-y-4">
                    <h3 className="font-semibold">Select Lead Involvement</h3>
                    <div>
                      <Label htmlFor="involvement">
                        Choose Entity (Acts as "To" section)
                      </Label>
                      <Select
                        key={`involvement-${formData.involvement_id}-${
                          leadInvolvements?.length || 0
                        }`}
                        value={formData.involvement_id}
                        onValueChange={(value) => {
                          const selectedInv = leadInvolvements?.find(
                            (inv) => inv.id === value
                          );
                          const entity = selectedInv?.entity_data;
                          const toData = entity
                            ? {
                                company_name: entity.company_name || "",
                                address: [
                                  entity.address,
                                  entity.city,
                                  entity.state,
                                  entity.pincode,
                                ]
                                  .filter(Boolean)
                                  .join(", "),
                                phone: entity.phone || entity.alternate_phone || "",
                                email: entity.email || "",
                                gst: entity.gstin || "",
                                website: entity.website || "",
                              }
                            : {};
                          setFormData((prev) => ({
                            ...prev,
                            involvement_id: value,
                            channel: "direct",
                            to_data: toData,
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              formData.involvement_id && leadInvolvements
                                ? leadInvolvements.find(
                                    (inv) => inv.id === formData.involvement_id,
                                  )?.entity_name || "Loading..."
                                : "Select entity involvement"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {leadInvolvements?.map((involvement) => (
                            <SelectItem
                              key={involvement.id}
                              value={involvement.id}
                              className="cursor-pointer"
                            >
                              <div className="w-full">
                                <div className="font-medium text-sm">
                                  {involvement.entity_name ||
                                    involvement.entity_data?.company_name ||
                                    involvement.entity_data?.name ||
                                    involvement.entity_data?.entity_name ||
                                    "Unknown Entity"}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {involvement.involvement_type?.replace(
                                    "_",
                                    " ",
                                  ) || "Unknown Type"}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {leadInvolvements?.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          No involvements found for this lead
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product Selection */}
                  <div className="border rounded-md p-4 space-y-4">
                    <h3 className="font-semibold">Add Products</h3>

                    {/* Row 1: Category → Subcategory → Product */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={selectedCategoryName}
                          onValueChange={(val) => {
                            setSelectedCategoryName(val);
                            setSelectedSubcategoryName("");
                            setCurrentItem((prev) => ({
                              ...prev,
                              product_id: "",
                              item_name: "",
                              product_code: "",
                              description: "",
                              specifications: [],
                              unit: "",
                              unit_price: 0,
                              price: 0,
                              percentage: 0,
                              total_price: 0,
                            }));
                            setProductSearchValue("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            {topCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Subcategory</Label>
                        <Select
                          value={selectedSubcategoryName}
                          onValueChange={(val) => {
                            setSelectedSubcategoryName(val);
                            setCurrentItem((prev) => ({
                              ...prev,
                              product_id: "",
                              item_name: "",
                              product_code: "",
                              description: "",
                              specifications: [],
                              unit: "",
                              unit_price: 0,
                              price: 0,
                              percentage: 0,
                              total_price: 0,
                            }));
                            setProductSearchValue("");
                          }}
                          disabled={subCategories.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                subCategories.length === 0
                                  ? "No subcategories"
                                  : "All subcategories"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {subCategories.map((sub) => (
                              <SelectItem key={sub.id} value={sub.name}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="product">Product</Label>
                        <Popover
                          open={(selectedCategoryName && !(subCategories.length > 0 && !selectedSubcategoryName)) ? productSearchOpen : false}
                          onOpenChange={(open) => {
                            if (selectedCategoryName && !(subCategories.length > 0 && !selectedSubcategoryName)) setProductSearchOpen(open);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={productSearchOpen}
                              className="w-full justify-between text-left font-normal"
                              data-testid="product-select"
                              disabled={!selectedCategoryName || (subCategories.length > 0 && !selectedSubcategoryName)}
                            >
                              {productSearchValue
                                ? productSearchValue
                                : !selectedCategoryName
                                ? "Select category first"
                                : subCategories.length > 0 && !selectedSubcategoryName
                                ? "Select subcategory first"
                                : "Select product..."}
                              <ArrowLeft className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[380px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search products..."
                                className="h-9"
                              />
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {filteredProducts.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={`${product.product_code} ${product.product_name}`}
                                    onSelect={() =>
                                      handleProductSelect(product.id)
                                    }
                                    className="flex flex-col items-start py-2"
                                  >
                                    <div className="font-medium text-sm">
                                      {product.product_code} -{" "}
                                      {product.product_name}
                                    </div>
                                    <div className="text-xs text-gray-500 flex gap-4">
                                      {product.subcategory && (
                                        <span className="text-blue-500">
                                          {product.subcategory}
                                        </span>
                                      )}
                                      <span>Unit: {product.unit}</span>
                                      <span>
                                        Price: ₹
                                        {product.unit_price?.toLocaleString()}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Row 2: Qty / Unit Price / Selling Price / Markup / Add */}
                    <div className="grid grid-cols-5 gap-3">
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={currentItem.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            const updatedItem = updateCurrentItemCalculations({
                              ...currentItem,
                              quantity: qty,
                            });
                            setCurrentItem(updatedItem);
                          }}
                          data-testid="quantity-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit_price">Unit Price</Label>
                        <Input
                          id="unit_price"
                          type="number"
                          step="0.01"
                          value={currentItem.unit_price}
                          disabled
                          className="bg-gray-50"
                          data-testid="unit-price-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Selling Price</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={currentItem.price}
                          onChange={(e) => {
                            const price = Number(e.target.value);
                            const updatedItem = updateCurrentItemCalculations({
                              ...currentItem,
                              price: price,
                            });
                            setCurrentItem(updatedItem);
                          }}
                          data-testid="selling-price-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="percentage">Markup %</Label>
                        <Input
                          id="percentage"
                          type="number"
                          step="0.01"
                          value={currentItem.percentage}
                          disabled
                          className="bg-gray-50"
                          data-testid="percentage-input"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={addItem}
                          className="w-full"
                          data-testid="add-item-btn"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="border rounded-md p-4 space-y-4">
                      <h3 className="font-semibold">BOQ Items</h3>
                      <div className="space-y-4">
                        {formData.items.map((item, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 p-4 rounded-lg bg-white space-y-3"
                          >
                            {editingItemIndex === index ? (
                              // Edit mode - Full width editable form
                              <div className="space-y-4">
                                {/* First row - Product Code and Name */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Product Code
                                    </Label>
                                    <Input
                                      value={editingItem.product_code}
                                      onChange={(e) =>
                                        setEditingItem({
                                          ...editingItem,
                                          product_code: e.target.value,
                                        })
                                      }
                                      className="text-sm"
                                      placeholder="Product code"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Product Name
                                    </Label>
                                    <Input
                                      value={editingItem.item_name}
                                      onChange={(e) =>
                                        setEditingItem({
                                          ...editingItem,
                                          item_name: e.target.value,
                                        })
                                      }
                                      className="text-sm"
                                      placeholder="Product name"
                                    />
                                  </div>
                                </div>

                                {/* Second row - Description */}
                                <div>
                                  <Label className="text-xs font-medium text-gray-500">
                                    Description
                                  </Label>
                                  <Textarea
                                    value={editingItem.description}
                                    onChange={(e) =>
                                      setEditingItem({
                                        ...editingItem,
                                        description: e.target.value,
                                      })
                                    }
                                    className="text-sm resize-none"
                                    rows={2}
                                    placeholder="Product description"
                                  />
                                </div>

                                {/* Third row - Specifications */}
                                <div>
                                  <Label className="text-xs font-medium text-gray-500">
                                    Specifications (comma separated)
                                  </Label>
                                  <Input
                                    value={editingItem.specifications.join(
                                      ", ",
                                    )}
                                    onChange={(e) =>
                                      setEditingItem({
                                        ...editingItem,
                                        specifications: e.target.value
                                          .split(",")
                                          .map((s) => s.trim())
                                          .filter((s) => s),
                                      })
                                    }
                                    className="text-sm"
                                    placeholder="Spec1, Spec2, Spec3"
                                  />
                                </div>

                                {/* Fourth row - Quantity, Unit, Price, Total */}
                                <div className="grid grid-cols-5 gap-4">
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Quantity
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={editingItem.quantity}
                                      onChange={(e) => {
                                        const qty = Number(e.target.value);
                                        const updatedItem =
                                          updateEditingItemCalculations({
                                            ...editingItem,
                                            quantity: qty,
                                          });
                                        setEditingItem(updatedItem);
                                      }}
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Unit
                                    </Label>
                                    <Input
                                      value={editingItem.unit}
                                      onChange={(e) =>
                                        setEditingItem({
                                          ...editingItem,
                                          unit: e.target.value,
                                        })
                                      }
                                      className="text-sm"
                                      placeholder="Unit"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Unit Price
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editingItem.unit_price}
                                      onChange={(e) => {
                                        const unitPrice = Number(
                                          e.target.value,
                                        );
                                        const updatedItem =
                                          updateEditingItemCalculations({
                                            ...editingItem,
                                            unit_price: unitPrice,
                                            price:
                                              editingItem.price || unitPrice,
                                          });
                                        setEditingItem(updatedItem);
                                      }}
                                      className="text-sm font-mono"
                                      disabled
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Selling Price
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editingItem.price}
                                      onChange={(e) => {
                                        const price = Number(e.target.value);
                                        const updatedItem =
                                          updateEditingItemCalculations({
                                            ...editingItem,
                                            price: price,
                                          });
                                        setEditingItem(updatedItem);
                                      }}
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Markup %
                                    </Label>
                                    <div className="h-9 flex items-center px-3 bg-gray-50 border rounded-md">
                                      <span className="text-sm text-gray-600">
                                        {editingItem.percentage.toFixed(2)}%
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-gray-500">
                                      Total Price
                                    </Label>
                                    <div className="h-9 flex items-center px-3 bg-gray-50 border rounded-md">
                                      <span className="font-mono font-semibold text-sm">
                                        ₹
                                        {(
                                          editingItem.quantity *
                                          editingItem.price
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleSaveItem}
                                      className="flex-1"
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      className="flex-1"
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // View mode - Enhanced display
                              <>
                                {/* Header with Product Code and Name */}
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {item.product_code && item.product_code !== item.item_name && (
                                        <span className="text-sm font-mono font-medium text-blue-600">
                                          {item.product_code}
                                        </span>
                                      )}
                                      <span className="text-sm font-semibold">
                                        {item.item_name}
                                      </span>
                                    </div>

                                    {/* Description — only show if different from item_name */}
                                    {item.description && item.description !== item.item_name && (
                                      <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                                        {item.description}
                                      </p>
                                    )}

                                    {/* Specifications as badges */}
                                    {item.specifications &&
                                      item.specifications.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                          {item.specifications.map(
                                            (spec, specIndex) => (
                                              <Badge
                                                key={specIndex}
                                                variant="secondary"
                                                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
                                              >
                                                {spec}
                                              </Badge>
                                            ),
                                          )}
                                        </div>
                                      )}

                                    {/* Quantity, Unit, Price info */}
                                    <div className="grid grid-cols-5 gap-4 text-sm">
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Quantity:
                                        </span>
                                        <div className="font-mono font-medium">
                                          {item.quantity} {item.unit}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Unit Price:
                                        </span>
                                        <div className="font-mono font-medium">
                                          ₹{item.unit_price.toLocaleString()}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Selling Price:
                                        </span>
                                        <div className="font-mono font-medium text-blue-600">
                                          ₹
                                          {(
                                            item.price || item.unit_price
                                          ).toLocaleString()}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Markup:
                                        </span>
                                        <div className="font-mono font-medium text-green-600">
                                          {(item.percentage || 0).toFixed(2)}%
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Total:
                                        </span>
                                        <div className="font-mono font-semibold text-green-600">
                                          ₹{item.total_price.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex-shrink-0 flex gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditItem(index)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeItem(index)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Tax Section */}
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="tax">Tax Percentage (%)</Label>
                          <Input
                            id="tax"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-32"
                            value={formData.tax_percentage}
                            onChange={(e) =>
                              handleTaxChange(Number(e.target.value))
                            }
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-1 text-sm font-mono">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>
                              ₹
                              {formData.subtotal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax ({formData.tax_percentage}%):</span>
                            <span>
                              ₹
                              {formData.tax_amount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Total:</span>
                            <span>
                              ₹
                              {formData.total_amount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        navigate(`/leads/${formData.lead_id || leadIdFromUrl}`)
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                      data-testid="submit-boq-btn"
                    >
                      {updateMutation.isPending && isEdit ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating AI Analysis...
                        </>
                      ) : createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : isEdit ? (
                        "Update BOQ"
                      ) : (
                        "Create BOQ"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Preview Panel - Always Visible */}
        <div className="w-1/2">
          <div className="sticky top-6 h-[calc(100vh-2rem)]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                BOQ Preview
              </h3>
              <p className="text-sm text-gray-600">
                Live preview of your BOQ with template
              </p>
            </div>
            <div className="h-[calc(100%-5rem)]">
              <BOQTemplatePreview boqData={formData} template={boqTemplate} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BOQForm;
