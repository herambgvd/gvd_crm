import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchBOQs, createBOQ, updateBOQ, deleteBOQ } from "../api";
import { fetchLeads } from "../../leads/api";
import { uploadDocument } from "../../documents/api";
import { useAuth } from "../../../context/AuthContext";
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
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  FileText,
  History,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import BOQVersionHistory from "./BOQVersionHistory";

const BOQs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBOQ, setEditingBOQ] = useState(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedBOQId, setSelectedBOQId] = useState(null);
  const [updatingBOQId, setUpdatingBOQId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    lead_id: "",
    channel: "",
    items: [],
    tax_percentage: 0,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });
  const [currentItem, setCurrentItem] = useState({
    item_name: "",
    quantity: 1,
    unit: "",
    unit_price: 0,
    total_price: 0,
  });

  const { data: boqsData, isLoading } = useQuery({
    queryKey: ["boqs"],
    queryFn: () => fetchBOQs({ page_size: 100 }),
  });
  const boqs = boqsData?.items || [];

  const { data: leadsData } = useQuery({
    queryKey: ["leads", "dropdown"],
    queryFn: () => fetchLeads({ page_size: 500 }),
  });
  const leads = leadsData?.items || [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const boq = await createBOQ(data);

      // Upload PDF if selected
      if (selectedFile) {
        await uploadDocument(selectedFile, "boq", boq.id);
      }

      return boq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boqs"] });
      toast.success("BOQ created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create BOQ");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      setUpdatingBOQId(id); // Set loading state
      return updateBOQ(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boqs"] });
      toast.success("BOQ updated successfully!");
      setIsDialogOpen(false);
      setUpdatingBOQId(null); // Clear loading state
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update BOQ");
      setUpdatingBOQId(null); // Clear loading state on error
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBOQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boqs"] });
      toast.success("BOQ deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete BOQ");
    },
  });

  const resetForm = () => {
    setFormData({
      lead_id: "",
      channel: "",
      items: [],
      tax_percentage: 0,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
    });
    setCurrentItem({
      item_name: "",
      quantity: 1,
      unit: "",
      unit_price: 0,
      total_price: 0,
    });
    setEditingBOQ(null);
    setSelectedFile(null);
  };

  const calculateTotals = (items, taxPercentage) => {
    const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const addItem = () => {
    if (!currentItem.item_name || !currentItem.unit) {
      toast.error("Please fill in all item details");
      return;
    }

    const totalPrice = currentItem.quantity * currentItem.unit_price;
    const item = { ...currentItem, total_price: totalPrice };
    const newItems = [...formData.items, item];
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
      item_name: "",
      quantity: 1,
      unit: "",
      unit_price: 0,
      total_price: 0,
    });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (!formData.lead_id) {
      toast.error("Please select a lead");
      return;
    }

    if (!formData.channel) {
      toast.error("Please select a channel");
      return;
    }

    if (editingBOQ) {
      // Prepare update data - only send fields that can be updated
      const updateData = {
        lead_id: formData.lead_id,
        channel: formData.channel,
        items: formData.items,
        tax_percentage: formData.tax_percentage,
      };
      updateMutation.mutate({ id: editingBOQ.id, data: updateData });
    } else {
      const createData = {
        lead_id: formData.lead_id,
        channel: formData.channel,
        items: formData.items,
        tax_percentage: formData.tax_percentage,
      };
      createMutation.mutate(createData);
    }
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
      <div className="space-y-6" data-testid="boqs-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold font-heading tracking-tight">
              BOQs
            </h1>
            <p className="text-gray-600 mt-2">
              Bill of Quantities management with PDF support
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="create-boq-btn">
                <Plus className="mr-2 h-4 w-4" />
                New BOQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBOQ ? "Edit BOQ" : "Create New BOQ"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-testid="boq-form"
              >
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                {/* Items Section */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="font-semibold">Add Items</h3>
                  <div className="grid grid-cols-5 gap-2">
                    <Input
                      placeholder="Item Name"
                      value={currentItem.item_name}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          item_name: e.target.value,
                        })
                      }
                      data-testid="item-name-input"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={currentItem.quantity}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          quantity: Number(e.target.value),
                        })
                      }
                      data-testid="item-quantity-input"
                    />
                    <Input
                      placeholder="Unit"
                      value={currentItem.unit}
                      onChange={(e) =>
                        setCurrentItem({ ...currentItem, unit: e.target.value })
                      }
                      data-testid="item-unit-input"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={currentItem.unit_price}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          unit_price: Number(e.target.value),
                        })
                      }
                      data-testid="item-price-input"
                    />
                    <Button
                      type="button"
                      onClick={addItem}
                      data-testid="add-item-btn"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="border-t pt-4 space-y-2">
                      {formData.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                        >
                          <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
                            <span className="font-medium">
                              {item.item_name}
                            </span>
                            <span className="font-mono">{item.quantity}</span>
                            <span>{item.unit}</span>
                            <span className="font-mono">
                              ₹{item.unit_price}
                            </span>
                            <span className="font-mono font-semibold">
                              ₹{item.total_price}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}

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
                </div>

                {/* PDF Upload */}
                <div>
                  <Label htmlFor="pdf">Technical Datasheet (PDF)</Label>
                  <Input
                    id="pdf"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    data-testid="pdf-upload-input"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
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
                    {updateMutation.isPending && editingBOQ ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating AI Analysis...
                      </>
                    ) : createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : editingBOQ ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* BOQs List */}
        <div className="space-y-4">
          {boqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  No BOQs found. Create your first BOQ!
                </p>
              </CardContent>
            </Card>
          ) : (
            boqs.map((boq) => (
              <Card
                key={boq.id}
                className="border border-gray-200 hover:shadow-md transition-all"
                data-testid="boq-card"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg font-heading">
                          {boq.boq_number || `BOQ #${boq.id.slice(0, 8)}`}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            v{boq.version || 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBOQId(boq.id);
                              setVersionHistoryOpen(true);
                            }}
                            title="View Version History"
                          >
                            <Info className="h-3 w-3 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                      {boq.project_name && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">Project:</span>{" "}
                          {boq.project_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        Channel: {boq.channel}
                      </p>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Items:</p>
                        <div className="space-y-1">
                          {boq.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm text-gray-600"
                            >
                              <span>
                                {item.item_name} ({item.quantity} {item.unit})
                              </span>
                              <span className="font-mono">
                                ₹{item.total_price.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t space-y-1 text-sm font-mono">
                          <div className="flex justify-between text-gray-600">
                            <span>Subtotal:</span>
                            <span>
                              ₹
                              {(boq.subtotal || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          {boq.tax_percentage > 0 && (
                            <div className="flex justify-between text-gray-600">
                              <span>Tax ({boq.tax_percentage}%):</span>
                              <span>
                                ₹
                                {(boq.tax_amount || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-lg pt-1 border-t">
                            <span>Total:</span>
                            <span>
                              ₹
                              {boq.total_amount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updatingBOQId === boq.id}
                        onClick={() => {
                          setEditingBOQ(boq);
                          setFormData({
                            lead_id: boq.lead_id,
                            channel: boq.channel,
                            items: boq.items,
                            tax_percentage: boq.tax_percentage || 0,
                            subtotal: boq.subtotal || 0,
                            tax_amount: boq.tax_amount || 0,
                            total_amount: boq.total_amount,
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        {updatingBOQId === boq.id ? (
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        ) : (
                          <Edit className="h-4 w-4 text-blue-600" />
                        )}
                      </Button>

                      {user?.role === "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete BOQ</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this BOQ? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(boq.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Version History Modal */}
      <BOQVersionHistory
        boqId={selectedBOQId}
        isOpen={versionHistoryOpen}
        onClose={() => {
          setVersionHistoryOpen(false);
          setSelectedBOQId(null);
        }}
      />
    </Layout>
  );
};

export default BOQs;
