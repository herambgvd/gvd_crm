import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchCustomer, createCustomer, updateCustomer } from "../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
      <div className="max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Button>

        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-heading">
              {isEdit ? "Edit Customer" : "Add New Customer"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company + Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input id="company_name" value={formData.company_name} onChange={set("company_name")} required />
                </div>
                <div>
                  <Label htmlFor="contact_person">Primary Contact Person *</Label>
                  <Input id="contact_person" value={formData.contact_person} onChange={set("contact_person")} required />
                </div>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={set("phone")} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={set("email")} />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={formData.address} onChange={set("address")} rows={2} />
              </div>

              {/* City / State / Pincode */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formData.city} onChange={set("city")} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={formData.state} onChange={set("state")} />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" value={formData.pincode} onChange={set("pincode")} />
                </div>
              </div>

              {/* GSTIN / PAN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input id="gstin" value={formData.gstin} onChange={set("gstin")} placeholder="29ABCDE1234F1Z5" />
                </div>
                <div>
                  <Label htmlFor="pan">PAN</Label>
                  <Input id="pan" value={formData.pan} onChange={set("pan")} placeholder="ABCDE1234F" />
                </div>
              </div>

              {/* Website + Notes */}
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formData.website} onChange={set("website")} placeholder="https://" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={set("notes")} rows={3} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/customers")}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {isEdit ? "Update Customer" : "Create Customer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CustomerForm;
