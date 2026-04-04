import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { BACKEND_URL } from "../../../lib/axios";
import {
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  fetchSalesOrder,
  fetchSalesOrders,
  previewPOFromBOQ,
  generatePOTemplate,
} from "../api";
import { fetchLead } from "../../leads/api";
import { fetchBOQs } from "../../boqs/api";
import { fetchDefaultTemplate } from "../../settings/api";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import {
  ArrowLeft,
  FileText,
  Download,
  ShoppingCart,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// PI Template Preview Component
const PITemplatePreview = ({ poData, template }) => {

  if (!template) {
    template = {
      header_text: "PROFORMA INVOICE",
      company_name: "Flowops",
      company_address: "",
      company_phone: "",
      company_email: "",
      terms_and_conditions: "Terms and conditions as per standard agreement.",
    };
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  // Fall back to template company data when from_data is empty
  const hasStoredFrom = poData.from_data && Object.values(poData.from_data).some(Boolean);
  const effectiveFromData = hasStoredFrom
    ? poData.from_data
    : {
        company_name: template.company_name || "",
        address: template.company_address || "",
        phone: template.company_phone || "",
        email: template.company_email || "",
        website: template.company_website || "",
        gst: template.company_gst || "",
      };

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="bg-white p-0 print:p-0 print:shadow-none">
          {/* Header */}
          <div className="mb-8">
            {template.header_image_url ? (
              <div className="w-full mb-6">
                <img
                  src={`${BACKEND_URL}${template.header_image_url}`}
                  alt="Company Header"
                  className="w-full object-contain"
                  style={{ display: "block" }}
                />
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 mb-6">
                <h1 className="text-4xl font-bold text-gray-900">
                  {template.company_name || "Flowops"}
                </h1>
                {template.company_address && (
                  <p className="text-sm text-gray-600 mt-3">
                    {template.company_address}
                  </p>
                )}
              </div>
            )}

            <div className="px-8">
              <div className="flex justify-between items-center border-b-2 border-gray-200 pb-4">
                <div></div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Date:{" "}
                    {poData.created_date || new Date().toLocaleDateString()}
                  </p>
                  {poData.boq_number && (
                    <p className="text-sm text-gray-600 mt-1">
                      {poData.boq_number}
                    </p>
                  )}
                </div>
              </div>

              {/* FROM/TO Data Section */}
              {(effectiveFromData || poData.to_data) && (
                <div className="grid grid-cols-2 gap-8 mt-6 mb-6">
                  {/* FROM Section */}
                  {effectiveFromData && Object.values(effectiveFromData).some(Boolean) && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">
                          FROM:
                        </h3>
                        <div className="text-sm text-gray-700 space-y-1">
                          {effectiveFromData.company_name && (
                            <p className="font-semibold">
                              {effectiveFromData.company_name}
                            </p>
                          )}
                          {effectiveFromData.address && (
                            <p>{effectiveFromData.address}</p>
                          )}
                          {effectiveFromData.phone && (
                            <p>Phone: {effectiveFromData.phone}</p>
                          )}
                          {effectiveFromData.email && (
                            <p>Email: {effectiveFromData.email}</p>
                          )}
                          {effectiveFromData.website && (
                            <p>Website: {effectiveFromData.website}</p>
                          )}
                          {effectiveFromData.gst && (
                            <p>GST: {effectiveFromData.gst}</p>
                          )}
                        </div>
                      </div>
                    )}

                  {/* TO Section */}
                  {poData.to_data && Object.keys(poData.to_data).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">
                        TO:
                      </h3>
                      <div className="text-sm text-gray-700 space-y-1">
                        {poData.to_data.company_name && (
                          <p className="font-semibold">
                            {poData.to_data.company_name}
                          </p>
                        )}
                        {poData.to_data.address && (
                          <p>{poData.to_data.address}</p>
                        )}
                        {poData.to_data.phone && (
                          <p>Phone: {poData.to_data.phone}</p>
                        )}
                        {poData.to_data.email && (
                          <p>Email: {poData.to_data.email}</p>
                        )}
                        {poData.to_data.gst && <p>GST: {poData.to_data.gst}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8 mb-8">
            <table className="w-full border-collapse">
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
                    Rate (₹)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border">
                    Amount (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {poData.items &&
                  poData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900 border">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border">
                        <div className="font-semibold">
                          {item.product_code
                            ? `${item.product_code} - ${
                                item.product_name ||
                                item.item_name ||
                                "Unnamed Item"
                              }`
                            : item.product_name ||
                              item.item_name ||
                              "Unnamed Item"}
                        </div>
                        {item.product_code && (
                          <div className="text-xs text-gray-600">
                            Code: {item.product_code}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border">
                        <div className="max-w-xs">
                          {item.description || "-"}
                          {item.specifications &&
                            item.specifications.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.specifications.map((spec, specIndex) => (
                                  <span
                                    key={specIndex}
                                    className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center border">
                        {item.quantity} {item.unit || "Nos"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right border font-mono">
                        ₹{(item.price || item.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right border font-mono font-semibold">
                        ₹{(item.total_price || (item.quantity * (item.price || item.unit_price || 0))).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border"
                  >
                    Subtotal:
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-900 border">
                    {formatCurrency(poData.subtotal || 0)}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border"
                  >
                    Tax ({poData.tax_percentage || 18}%):
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-gray-900 border">
                    {formatCurrency(poData.tax_amount || 0)}
                  </td>
                </tr>
                <tr className="bg-gray-100">
                  <td
                    colSpan="5"
                    className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border"
                  >
                    Total Amount:
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-green-600 border font-mono">
                    {formatCurrency(poData.total_amount || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {poData.notes && (
            <div className="px-8 mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Notes:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {poData.notes}
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          {template.terms_and_conditions && (
            <div className="px-8 mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Terms and Conditions:
              </h3>
              <div className="text-sm text-gray-700 space-y-2">
                {template.terms_and_conditions
                  .split("\n")
                  .map((term, index) => (
                    <p key={index}>{term}</p>
                  ))}
              </div>
            </div>
          )}

          {/* Footer */}
          {template.footer_image_url ? (
            <div className="w-full mt-8">
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
                    <span className="font-semibold">Phone:</span>
                    <span className="ml-1">{template.company_phone}</span>
                  </p>
                )}
                {template.company_email && (
                  <p className="flex items-center">
                    <span className="font-semibold">Email:</span>
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

const SalesOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const leadIdFromUrl = searchParams.get("lead_id");
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    lead_id: leadIdFromUrl || "",
    channel: "",
    project_name: "",
    total_amount: 0,
    boq_id: "",
    status: "pending",
    subtotal: 0,
    tax_percentage: 0,
    tax_amount: 0,
    from_data: {},
    to_data: {},
    notes: "",
    items: [],
  });

  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: lead } = useQuery({
    queryKey: ["lead", formData.lead_id],
    queryFn: () => fetchLead(formData.lead_id),
    enabled: !!formData.lead_id,
  });

  const { data: allBOQsData } = useQuery({
    queryKey: ["boqs", "byLead", formData.lead_id],
    queryFn: () => fetchBOQs({ page_size: 500, lead_id: formData.lead_id }),
    enabled: !!formData.lead_id,
  });

  const boqsForLead = allBOQsData?.items || [];

  const { data: poTemplate } = useQuery({
    queryKey: ["defaultTemplate", "invoice"],
    queryFn: () => fetchDefaultTemplate("invoice"),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: order, isLoading: isLoadingOrder } = useQuery({
    queryKey: ["salesOrder", id],
    queryFn: () => fetchSalesOrder(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (order) {
      setFormData({
        lead_id: order.lead_id,
        channel: order.channel || "",
        project_name: order.project_name || "",
        total_amount: order.total_amount || 0,
        boq_id: order.boq_id || "",
        status: order.status || "pending",
        subtotal: order.subtotal || 0,
        tax_percentage: order.tax_percentage || 0,
        tax_amount: order.tax_amount || 0,
        from_data: order.from_data || {},
        to_data: order.to_data || {},
        notes: order.notes || "",
        items: order.items || [],
      });

      // Set preview data directly from the order for edit mode
      const orderPreviewData = {
        id: order.id,
        order_number: order.pi_number || order.order_number || "GVD-PI-000001",
        boq_id: order.boq_id,
        boq_number: order.boq_number || "",
        lead_id: order.lead_id,
        channel: order.channel || "",
        project_name: order.project_name || "",
        items: order.items || [],
        total_amount: order.total_amount || 0,
        subtotal: order.subtotal || 0,
        tax_percentage: order.tax_percentage || 0,
        tax_amount: order.tax_amount || 0,
        created_date: order.created_at
          ? new Date(order.created_at).toLocaleDateString()
          : new Date().toLocaleDateString(),
        from_data: order.from_data || {},
        to_data: order.to_data || {},
        notes: order.notes || "",
      };

      setPreviewData(orderPreviewData);

      // Load fresh BOQ data — BOQ is source of truth for items/amounts
      if (order.boq_id) {
        setIsLoadingPreview(true);
        previewPOFromBOQ(order.boq_id)
          .then((freshBoqData) => {
            const freshItems = freshBoqData.items || [];
            // Update formData with fresh BOQ items and recalculated totals
            setFormData((prev) => ({
              ...prev,
              items: freshItems,
              subtotal: freshBoqData.subtotal || prev.subtotal,
              tax_amount: freshBoqData.tax_amount || prev.tax_amount,
              total_amount: freshBoqData.total_amount || prev.total_amount,
            }));
            // Preview: keep order metadata (notes, status, dates) but use BOQ for items/amounts
            setPreviewData({
              ...orderPreviewData,
              items: freshItems,
              subtotal: freshBoqData.subtotal || orderPreviewData.subtotal,
              tax_amount: freshBoqData.tax_amount || orderPreviewData.tax_amount,
              total_amount: freshBoqData.total_amount || orderPreviewData.total_amount,
              from_data: orderPreviewData.from_data,
              to_data: orderPreviewData.to_data,
            });
          })
          .catch(() => { /* keep order preview data */ })
          .finally(() => setIsLoadingPreview(false));
      }
    }
  }, [order]);

  useEffect(() => {
    if (lead && !isEdit) {
      setFormData((prev) => ({
        ...prev,
        channel: lead.channel,
        project_name: lead.project_name || "",
      }));
    }
  }, [lead, isEdit]);

  // Update preview when form data changes
  useEffect(() => {
    if (previewData && formData.boq_id && (formData.status || formData.notes)) {
      setPreviewData((prev) =>
        prev
          ? {
              ...prev,
              status: formData.status,
              notes: formData.notes,
              from_data: formData.from_data || {},
              to_data: formData.to_data || {},
              project_name: formData.project_name,
              subtotal: formData.subtotal,
              tax_percentage: formData.tax_percentage,
              tax_amount: formData.tax_amount,
            }
          : null,
      );
    }
  }, [formData.status, formData.notes, formData.boq_id, previewData?.id]);

  const createMutation = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["lead", formData.lead_id] });
      toast.success("Sales order created successfully!");
      navigate(`/leads/${formData.lead_id}`);
    },
    onError: (error) => {
      let errorMessage = "Failed to create sales order";

      try {
        if (error.response?.data) {
          const data = error.response.data;
          if (typeof data === "string") {
            errorMessage = data;
          } else if (data.detail) {
            if (typeof data.detail === "string") {
              errorMessage = data.detail;
            } else if (Array.isArray(data.detail)) {
              errorMessage = data.detail
                .map((err) => {
                  if (typeof err === "string") return err;
                  return err.msg || err.message || "Validation error";
                })
                .join(", ");
            } else {
              errorMessage = JSON.stringify(data.detail);
            }
          } else if (data.message) {
            errorMessage = data.message;
          } else if (Array.isArray(data)) {
            errorMessage = data
              .map((err) => {
                if (typeof err === "string") return err;
                return err.msg || err.message || "Validation error";
              })
              .join(", ");
          }
        }
      } catch (parseError) {
        errorMessage = "Failed to create sales order - Invalid response";
      }

      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateSalesOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["lead", formData.lead_id] });
      toast.success("Sales order updated successfully!");
      navigate(`/leads/${formData.lead_id}`);
    },
    onError: (error) => {
      let errorMessage = "Failed to update sales order";

      try {
        if (error.response?.data) {
          const data = error.response.data;
          if (typeof data === "string") {
            errorMessage = data;
          } else if (data.detail) {
            if (typeof data.detail === "string") {
              errorMessage = data.detail;
            } else if (Array.isArray(data.detail)) {
              errorMessage = data.detail
                .map((err) => {
                  if (typeof err === "string") return err;
                  return err.msg || err.message || "Validation error";
                })
                .join(", ");
            } else {
              errorMessage = JSON.stringify(data.detail);
            }
          } else if (data.message) {
            errorMessage = data.message;
          } else if (Array.isArray(data)) {
            errorMessage = data
              .map((err) => {
                if (typeof err === "string") return err;
                return err.msg || err.message || "Validation error";
              })
              .join(", ");
          }
        }
      } catch (parseError) {
        errorMessage = "Failed to update sales order - Invalid response";
      }

      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSalesOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["lead", formData.lead_id] });
      toast.success("Sales order deleted successfully!");
      navigate(`/leads/${formData.lead_id}`);
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to delete sales order";
      toast.error(errorMessage);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const handleBOQSelect = async (boqId) => {
    const boq = boqsForLead.find((b) => b.id === boqId);
    if (boq) {
      setFormData({
        ...formData,
        boq_id: boqId,
        total_amount: boq.total_amount,
        subtotal: boq.subtotal || 0,
        tax_percentage: boq.tax_percentage || 0,
        tax_amount: boq.tax_amount || 0,
        project_name: boq.project_name || formData.project_name,
        items: boq.items || [],
        channel: boq.channel || formData.channel,
        from_data: boq.from_data || {},
        to_data: boq.to_data || {},
      });

      // Load preview data
      if (boqId) {
        setIsLoadingPreview(true);
        try {
          const preview = await previewPOFromBOQ(boqId);

          // Use boq list data as source of truth (has selling price), fallback to preview
          const freshItems = boq.items?.length ? boq.items : (preview.items || []);
          const enrichedPreview = {
            ...preview,
            items: freshItems,
            from_data: boq.from_data || {},
            to_data: boq.to_data || {},
            project_name: boq.project_name || lead?.project_name,
            subtotal: boq.subtotal || preview.subtotal || 0,
            tax_percentage: boq.tax_percentage ?? preview.tax_percentage ?? 0,
            tax_amount: boq.tax_amount ?? preview.tax_amount ?? 0,
            total_amount: boq.total_amount || preview.total_amount || 0,
          };

          setPreviewData(enrichedPreview);
        } catch (error) {
          const errorMessage =
            error.response?.data?.detail ||
            error.message ||
            "Failed to load BOQ preview";
          toast.error(
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to load BOQ preview",
          );
        } finally {
          setIsLoadingPreview(false);
        }
      }
    } else {
      setPreviewData(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.lead_id) {
      toast.error("Lead ID is missing. Please go back and try again.");
      return;
    }

    // Transform BOQ items to PIItem schema — preserve price (selling price) for backend recalc
    const transformedItems = formData.items.map((item) => ({
      product_id: item.product_id || "",
      product_code: item.product_code || "",
      product_name: item.product_name || "",
      item_name: item.item_name || "",
      description: item.description || "",
      specifications: item.specifications || [],
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0.0,
      price: item.price || item.unit_price || 0.0,
      percentage: item.percentage || 0,
      total_price: item.total_price || 0.0,
      unit: item.unit || "",
    }));

    const submitData = {
      ...formData,
      items: transformedItems,
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isLoadingOrder) {
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
        {/* Main Form - 50% width */}
        <div className="w-1/2">
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() =>
                navigate(`/leads/${formData.lead_id || leadIdFromUrl}`)
              }
              className="shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lead
            </Button>

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-2xl font-heading">
                  {isEdit
                    ? "Edit Proforma Invoice"
                    : "Create New Proforma Invoice"}
                </CardTitle>
                {(lead || formData.to_data?.company_name) && (
                  <p className="text-sm text-gray-600">
                    For:{" "}
                    {formData.to_data?.company_name ||
                      [lead?.contact_name, lead?.company]
                        .filter(Boolean)
                        .join(" - ") ||
                      "—"}
                    {(lead?.project_name || formData.project_name) && (
                      <span className="ml-2 font-semibold">
                        | Project: {lead?.project_name || formData.project_name}
                      </span>
                    )}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  data-testid="sales-order-form"
                >
                  {boqsForLead.length > 0 ? (
                    <div className="space-y-3">
                      <Label
                        htmlFor="boq_id"
                        className="text-sm font-medium text-gray-700"
                      >
                        Select BOQ to create PI *
                      </Label>
                      <Select
                        value={formData.boq_id}
                        onValueChange={handleBOQSelect}
                      >
                        <SelectTrigger
                          data-testid="boq-select"
                          className="w-full"
                        >
                          <SelectValue placeholder="Choose a BOQ from this lead" />
                        </SelectTrigger>
                        <SelectContent>
                          {boqsForLead.map((boq) => (
                            <SelectItem key={boq.id} value={boq.id}>
                              <div className="flex justify-between items-center w-full">
                                <span className="font-medium">
                                  {boq.boq_number ||
                                    `BOQ #${boq.id.slice(0, 8)}`}
                                </span>
                                <span className="text-green-600 font-mono ml-4">
                                  ₹{boq.total_amount.toLocaleString()} (
                                  {boq.items?.length || 0} items)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        BOQ is required to create a Proforma Invoice with proper
                        items and pricing.
                      </p>
                      {formData.boq_id && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                            </div>
                            <p className="ml-2 text-sm text-green-700 font-medium">
                              BOQ selected successfully. Items and amount will
                              be copied to PI.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <FileText className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-orange-800">
                            BOQ Required
                          </h3>
                          <p className="text-sm text-orange-700 mt-1">
                            You need to create a BOQ first before generating a
                            Proforma Invoice. The BOQ will provide the items,
                            quantities, and pricing for your PI.
                          </p>
                          <div className="mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-orange-300 text-orange-700 hover:bg-orange-100"
                              onClick={() =>
                                navigate(
                                  `/boqs/new?lead_id=${formData.lead_id}`,
                                )
                              }
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create BOQ First
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="status"
                        className="text-sm font-medium text-gray-700"
                      >
                        Status
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
                              Pending
                            </div>
                          </SelectItem>
                          <SelectItem value="confirmed">
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-blue-400 rounded-full mr-2"></div>
                              Confirmed
                            </div>
                          </SelectItem>
                          <SelectItem value="in_progress">
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-orange-400 rounded-full mr-2"></div>
                              In Progress
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                              Completed
                            </div>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-red-400 rounded-full mr-2"></div>
                              Cancelled
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="total_amount"
                        className="text-sm font-medium text-gray-700"
                      >
                        Total Amount (₹) *
                      </Label>
                      <Input
                        id="total_amount"
                        type="number"
                        step="0.01"
                        value={formData.total_amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_amount: Number(e.target.value),
                          })
                        }
                        required
                        disabled={!!formData.boq_id}
                        className={`w-full ${
                          formData.boq_id ? "bg-gray-50" : ""
                        }`}
                        placeholder="0.00"
                        data-testid="total-amount-input"
                      />
                      {formData.boq_id && (
                        <p className="text-xs text-gray-500 flex items-center">
                          <div className="h-1 w-1 bg-gray-400 rounded-full mr-2"></div>
                          Amount automatically filled from selected BOQ
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="notes"
                      className="text-sm font-medium text-gray-700"
                    >
                      Additional Notes
                    </Label>
                    <div className="border border-gray-300 rounded-md">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                          onClick={() => {
                            const textarea = document.getElementById("notes");
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const beforeText = text.substring(0, start);
                            const selectedText = text.substring(start, end);
                            const afterText = text.substring(end);
                            const newText =
                              beforeText + "• " + selectedText + afterText;
                            setFormData({ ...formData, notes: newText });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, end + 2);
                            }, 0);
                          }}
                        >
                          • Bullet
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                          onClick={() => {
                            const textarea = document.getElementById("notes");
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const beforeText = text.substring(0, start);
                            const selectedText = text.substring(start, end);
                            const afterText = text.substring(end);
                            const newText =
                              beforeText + "1. " + selectedText + afterText;
                            setFormData({ ...formData, notes: newText });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 3, end + 3);
                            }, 0);
                          }}
                        >
                          1. Number
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                          onClick={() => {
                            const textarea = document.getElementById("notes");
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const beforeText = text.substring(0, start);
                            const selectedText = text.substring(start, end);
                            const afterText = text.substring(end);
                            const newText =
                              beforeText + "→ " + selectedText + afterText;
                            setFormData({ ...formData, notes: newText });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, end + 2);
                            }, 0);
                          }}
                        >
                          → Arrow
                        </button>
                      </div>
                      <Textarea
                        id="notes"
                        placeholder="Add notes with formatting:\n• Bullet point\n1. Numbered list\n→ Arrow points\n\nAny special instructions, delivery requirements, payment terms, or additional information..."
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={6}
                        className="w-full resize-none border-0 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        navigate(`/leads/${formData.lead_id || leadIdFromUrl}`)
                      }
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Cancel
                    </Button>

                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <AlertDialog
                          open={deleteDialogOpen}
                          onOpenChange={setDeleteDialogOpen}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              className="flex items-center gap-2"
                            >
                              {deleteMutation.isPending ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete PI"
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Proforma Invoice
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this Proforma
                                Invoice? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending
                                  ? "Deleting..."
                                  : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button
                        type="submit"
                        disabled={
                          createMutation.isPending ||
                          updateMutation.isPending ||
                          deleteMutation.isPending ||
                          !formData.boq_id
                        }
                        data-testid="submit-order-btn"
                        className="flex items-center gap-2 min-w-[140px] bg-green-600 hover:bg-green-700 text-white"
                      >
                        {createMutation.isPending ||
                        updateMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {isEdit ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            {isEdit ? "Update PI" : "Create PI"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Preview Panel - Always Visible - 50% width */}
        <div className="w-1/2">
          <div className="sticky top-6 h-[calc(100vh-3rem)]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Proforma Invoice Preview
              </h3>
              <p className="text-sm text-gray-600">
                Live preview of your PI with template
              </p>
            </div>
            <div className="h-full overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {previewData || (formData.boq_id && formData.items.length > 0) ? (
                <PITemplatePreview
                  poData={{
                    ...(previewData || {}),
                    status: formData.status,
                    notes: formData.notes,
                    // Prefer previewData items (fresh from BOQ) over formData items (may be stale)
                    items: previewData?.items?.length ? previewData.items : (formData.items || []),
                    total_amount: previewData?.total_amount || formData.total_amount || 0,
                    subtotal: previewData?.subtotal || formData.subtotal || 0,
                    tax_percentage: previewData?.tax_percentage ?? formData.tax_percentage ?? 0,
                    tax_amount: previewData?.tax_amount ?? formData.tax_amount ?? 0,
                    channel: formData.channel || previewData?.channel || "",
                    project_name: formData.project_name || previewData?.project_name || "",
                    order_number: previewData?.order_number || "GVD-PI-000001",
                    created_date: previewData?.created_date || new Date().toLocaleDateString(),
                    from_data: formData.from_data || previewData?.from_data || {},
                    to_data: formData.to_data || previewData?.to_data || {},
                  }}
                  template={poTemplate}
                />
              ) : isLoadingPreview ? (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Loading preview...</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="flex flex-col items-center gap-4">
                    <FileText className="h-12 w-12 text-gray-400" />
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Preview Available
                      </h3>
                      <p className="text-sm text-gray-500">
                        Select a BOQ to generate preview
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SalesOrderForm;
