import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import {
  fetchPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  uploadPODocument,
} from "../api";
import { fetchLead } from "../../leads/api";
import { fetchSalesOrders } from "../../sales-orders/api";
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
import { ArrowLeft, Upload, File, Download } from "lucide-react";
import { toast } from "sonner";

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const isViewMode =
    window.location.pathname.includes("/edit") === false && Boolean(id);

  const [formData, setFormData] = useState({
    pi_id: "",
    vendor_name: "",
    vendor_address: "",
    vendor_contact: "",
    vendor_email: "",
    delivery_date: "",
    payment_terms: "",
    shipping_address: "",
    advance_amount: 0,
    status: "draft",
    notes: "",
    additional_info: {},
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [derivedLeadId, setDerivedLeadId] = useState(leadId); // Track derived lead ID

  // Fetch lead data if creating PO from lead
  const { data: lead } = useQuery({
    queryKey: ["lead", derivedLeadId],
    queryFn: () => fetchLead(derivedLeadId),
    enabled: !!derivedLeadId,
  });

  const { data: proformaInvoicesData, isLoading: isLoadingPIs } = useQuery({
    queryKey: ["salesOrders", "dropdown"],
    queryFn: () => fetchSalesOrders({ page_size: 500 }),
  });
  const proformaInvoices = proformaInvoicesData?.items || [];

  // Filter proforma invoices for specific lead if derivedLeadId is present
  const filteredProformaInvoices = derivedLeadId
    ? proformaInvoices.filter((pi) => pi.lead_id === derivedLeadId)
    : proformaInvoices;


  const { data: purchaseOrder, isLoading: isLoadingPO } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => fetchPurchaseOrder(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        pi_id: purchaseOrder.pi_id || "",
        vendor_name: purchaseOrder.vendor_name || "",
        vendor_address: purchaseOrder.vendor_address || "",
        vendor_contact: purchaseOrder.vendor_contact || "",
        vendor_email: purchaseOrder.vendor_email || "",
        delivery_date: purchaseOrder.delivery_date || "",
        payment_terms: purchaseOrder.payment_terms || "",
        shipping_address: purchaseOrder.shipping_address || "",
        advance_amount: purchaseOrder.advance_amount || 0,
        status: purchaseOrder.status || "draft",
        notes: purchaseOrder.notes || "",
        additional_info: purchaseOrder.additional_info || {},
      });

      // Derive lead ID from the associated PI if not provided in URL
      if (!leadId && purchaseOrder.pi_id && proformaInvoices.length > 0) {
        const associatedPI = proformaInvoices.find(
          (pi) => pi.id === purchaseOrder.pi_id,
        );
        if (associatedPI && associatedPI.lead_id) {
          setDerivedLeadId(associatedPI.lead_id);
        }
      }
    }
  }, [purchaseOrder, leadId, proformaInvoices]);

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      if (derivedLeadId) {
        queryClient.invalidateQueries({ queryKey: ["lead", derivedLeadId] });
      }
      toast.success("Purchase Order created successfully");
      if (selectedFile) {
        uploadDocumentMutation.mutate({ poId: data.id, file: selectedFile });
      } else {
        if (derivedLeadId) {
          navigate(`/leads/${derivedLeadId}`);
        } else {
          navigate("/purchase-orders");
        }
      }
    },
    onError: (error) => {
      toast.error(`Error creating purchase order: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updatePurchaseOrder(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      if (derivedLeadId) {
        queryClient.invalidateQueries({ queryKey: ["lead", derivedLeadId] });
      }
      toast.success("Purchase Order updated successfully");
      if (selectedFile) {
        uploadDocumentMutation.mutate({ poId: data.id, file: selectedFile });
      } else {
        if (derivedLeadId) {
          navigate(`/leads/${derivedLeadId}`);
        } else {
          navigate("/purchase-orders");
        }
      }
    },
    onError: (error) => {
      toast.error(`Error updating purchase order: ${error.message}`);
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ poId, file }) => uploadPODocument(poId, file),
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      if (derivedLeadId) {
        navigate(`/leads/${derivedLeadId}`);
      } else {
        navigate("/purchase-orders");
      }
    },
    onError: (error) => {
      toast.error(`Error uploading document: ${error.message}`);
      if (derivedLeadId) {
        navigate(`/leads/${derivedLeadId}`);
      } else {
        navigate("/purchase-orders");
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.pi_id) {
      toast.error("Please select a Proforma Invoice");
      return;
    }

    const submitData = {
      ...formData,
      advance_amount: Number(formData.advance_amount),
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const selectedPI = filteredProformaInvoices.find(
    (pi) => pi.id === formData.pi_id,
  );

  if (isLoadingPO && isEdit) {
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
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (derivedLeadId) {
                navigate(`/leads/${derivedLeadId}`);
              } else {
                navigate("/purchase-orders");
              }
            }}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {derivedLeadId ? "Back to Lead" : "Back to Purchase Orders"}
          </Button>

          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {isViewMode
                ? "View Purchase Order"
                : isEdit
                  ? "Edit Purchase Order"
                  : "Create New Purchase Order"}
            </h1>
            {lead && (
              <p className="text-sm text-gray-600 mt-1">
                For: {lead.contact_name} - {lead.company}
              </p>
            )}
            {isViewMode && (
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/purchase-orders/${id}/edit${
                        derivedLeadId ? `?lead_id=${derivedLeadId}` : ""
                      }`,
                    )
                  }
                >
                  Edit Purchase Order
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PI Selection */}
              <div className="space-y-2">
                <Label htmlFor="pi_id" className="text-sm font-medium">
                  Select Proforma Invoice *
                </Label>
                <Select
                  value={formData.pi_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, pi_id: value })
                  }
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a Proforma Invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPIs ? (
                      <div className="p-2 text-center text-gray-500">
                        Loading...
                      </div>
                    ) : filteredProformaInvoices.length === 0 ? (
                      <div className="p-2 text-center text-gray-500">
                        {leadId
                          ? "No PIs found for this lead"
                          : "No PIs available"}
                      </div>
                    ) : (
                      filteredProformaInvoices.map((pi) => (
                        <SelectItem key={pi.id} value={pi.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>
                              {pi.so_number || pi.pi_number || `SO-${pi.id}`}
                            </span>
                            <span className="text-green-600 font-mono ml-4">
                              ₹
                              {(
                                pi.total_amount ||
                                pi.amount ||
                                0
                              )?.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedPI && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Selected PI:</strong>{" "}
                      {selectedPI.so_number ||
                        selectedPI.pi_number ||
                        `SO-${selectedPI.id}`}{" "}
                      - ₹
                      {(
                        selectedPI.total_amount ||
                        selectedPI.amount ||
                        0
                      )?.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Vendor Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="vendor_name" className="text-sm font-medium">
                    Vendor Name *
                  </Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_name: e.target.value })
                    }
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="vendor_contact"
                    className="text-sm font-medium"
                  >
                    Vendor Contact
                  </Label>
                  <Input
                    id="vendor_contact"
                    value={formData.vendor_contact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vendor_contact: e.target.value,
                      })
                    }
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor_email" className="text-sm font-medium">
                    Vendor Email
                  </Label>
                  <Input
                    id="vendor_email"
                    type="email"
                    value={formData.vendor_email}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_email: e.target.value })
                    }
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="delivery_date"
                    className="text-sm font-medium"
                  >
                    Delivery Date
                  </Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivery_date: e.target.value,
                      })
                    }
                    disabled={isViewMode}
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="vendor_address"
                    className="text-sm font-medium"
                  >
                    Vendor Address
                  </Label>
                  <Textarea
                    id="vendor_address"
                    value={formData.vendor_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vendor_address: e.target.value,
                      })
                    }
                    rows={3}
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="shipping_address"
                    className="text-sm font-medium"
                  >
                    Shipping Address
                  </Label>
                  <Textarea
                    id="shipping_address"
                    value={formData.shipping_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shipping_address: e.target.value,
                      })
                    }
                    rows={3}
                    disabled={isViewMode}
                  />
                </div>
              </div>

              {/* Financial and Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="advance_amount"
                    className="text-sm font-medium"
                  >
                    Advance Amount (₹)
                  </Label>
                  <Input
                    id="advance_amount"
                    type="number"
                    step="0.01"
                    value={formData.advance_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        advance_amount: e.target.value,
                      })
                    }
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="payment_terms"
                    className="text-sm font-medium"
                  >
                    Payment Terms
                  </Label>
                  <Input
                    id="payment_terms"
                    value={formData.payment_terms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_terms: e.target.value,
                      })
                    }
                    placeholder="e.g., 30 days net"
                    disabled={isViewMode}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={4}
                  placeholder="Additional notes, terms, or instructions..."
                  disabled={isViewMode}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="document" className="text-sm font-medium">
                  Upload PO Document
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="document"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={isViewMode}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <File className="h-4 w-4" />
                      {selectedFile.name}
                    </div>
                  )}
                  {purchaseOrder?.document_url && !selectedFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(purchaseOrder.document_url, "_blank")
                      }
                    >
                      <Download className="h-4 w-4 mr-1" />
                      View Current Document
                    </Button>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              {!isViewMode && (
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (derivedLeadId) {
                        navigate(`/leads/${derivedLeadId}`);
                      } else {
                        navigate("/purchase-orders");
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {isEdit ? "Updating..." : "Creating..."}
                      </>
                    ) : isEdit ? (
                      "Update PO"
                    ) : (
                      "Create PO"
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PurchaseOrderForm;
