import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchCustomer, createCustomer, updateCustomer } from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent } from "../../../components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCustomer } from "../api";

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    alternate_phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    pan: "",
    website: "",
    notes: "",
    status: "active",
  });

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => fetchCustomer(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        company_name: customer.company_name || "",
        contact_person: customer.contact_person || "",
        email: customer.email || "",
        phone: customer.phone || "",
        alternate_phone: customer.alternate_phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        pincode: customer.pincode || "",
        gstin: customer.gstin || "",
        pan: customer.pan || "",
        website: customer.website || "",
        notes: customer.notes || "",
        status: customer.status || "active",
      });
    }
  }, [customer]);

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      toast.success("Customer created successfully!");
      navigate("/customers");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to create customer"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      toast.success("Customer updated successfully!");
      navigate("/customers");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to update customer"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // entity_type is forced to end_customer on backend
    if (isEdit) updateMutation.mutate(formData);
    else createMutation.mutate({ ...formData, entity_type: "end_customer" });
  };

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      toast.success("Customer deleted successfully!");
      navigate("/customers");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to delete customer"),
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Customers
          </Button>
          {isEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section: Basic Info */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isEdit ? "Edit Customer" : "New Customer"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Company Name *</Label>
                  <Input className="h-9 text-sm" id="company_name" value={formData.company_name} onChange={set("company_name")} required />
                </div>
                <div>
                  <Label className="text-xs">Contact Person *</Label>
                  <Input className="h-9 text-sm" id="contact_person" value={formData.contact_person} onChange={set("contact_person")} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input className="h-9 text-sm" id="phone" value={formData.phone} onChange={set("phone")} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input className="h-9 text-sm" id="email" type="email" value={formData.email} onChange={set("email")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Address */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p>
              <div>
                <Label className="text-xs">Address</Label>
                <Textarea className="text-sm resize-none" id="address" value={formData.address} onChange={set("address")} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input className="h-9 text-sm" id="city" value={formData.city} onChange={set("city")} />
                </div>
                <div>
                  <Label className="text-xs">State</Label>
                  <Input className="h-9 text-sm" id="state" value={formData.state} onChange={set("state")} />
                </div>
                <div>
                  <Label className="text-xs">Pincode</Label>
                  <Input className="h-9 text-sm" id="pincode" value={formData.pincode} onChange={set("pincode")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Additional */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">GSTIN</Label>
                  <Input className="h-9 text-sm" id="gstin" value={formData.gstin} onChange={set("gstin")} placeholder="29ABCDE1234F1Z5" />
                </div>
                <div>
                  <Label className="text-xs">PAN</Label>
                  <Input className="h-9 text-sm" id="pan" value={formData.pan} onChange={set("pan")} placeholder="ABCDE1234F" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input className="h-9 text-sm" id="website" value={formData.website} onChange={set("website")} placeholder="https://" />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea className="text-sm resize-none" id="notes" value={formData.notes} onChange={set("notes")} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/customers")}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEdit ? "Update" : "Create Customer"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CustomerForm;
