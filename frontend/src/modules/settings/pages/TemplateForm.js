import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchTemplateById, createTemplate, updateTemplate } from "../api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
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
import { Checkbox } from "../../../components/ui/checkbox";
import { ArrowLeft, Upload, X, Image, FileText } from "lucide-react";
import { toast } from "sonner";

const TemplateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const headerFileRef = useRef(null);
  const footerFileRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "boq",
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    company_gst: "",
    terms_and_conditions: "",
    is_active: true,
    is_default: false,
  });

  const [files, setFiles] = useState({
    header_image: null,
    footer_image: null,
  });

  const [previewUrls, setPreviewUrls] = useState({
    header_image: null,
    footer_image: null,
  });

  // Fetch template data if editing
  const { data: templateData, isLoading: templateLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: () => fetchTemplateById(id),
    enabled: isEditing,
  });

  useEffect(() => {
    if (templateData && isEditing) {
      setFormData({
        name: templateData.name || "",
        description: templateData.description || "",
        type: templateData.type || "boq",
        company_name: templateData.company_name || "",
        company_address: templateData.company_address || "",
        company_phone: templateData.company_phone || "",
        company_email: templateData.company_email || "",
        company_website: templateData.company_website || "",
        company_gst: templateData.company_gst || "",
        terms_and_conditions: templateData.terms_and_conditions || "",
        is_active: templateData.is_active ?? true,
        is_default: templateData.is_default ?? false,
      });

      // Set existing image URLs for preview
      setPreviewUrls({
        header_image: templateData.header_image_url
          ? `http://localhost:8000${templateData.header_image_url}`
          : null,
        footer_image: templateData.footer_image_url
          ? `http://localhost:8000${templateData.footer_image_url}`
          : null,
      });
    }
  }, [templateData, isEditing]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const formDataObj = new FormData();

      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataObj.append(key, value);
        }
      });

      // Add files if present
      if (files.header_image) {
        formDataObj.append("header_image", files.header_image);
      }
      if (files.footer_image) {
        formDataObj.append("footer_image", files.footer_image);
      }

      if (isEditing) {
        return updateTemplate(id, formDataObj);
      } else {
        return createTemplate(formDataObj);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["templates"]);
      toast.success(
        `Template ${isEditing ? "updated" : "created"} successfully!`,
      );
      navigate("/settings/templates");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${isEditing ? "update" : "create"} template`,
      );
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (type, file) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setFiles((prev) => ({
        ...prev,
        [type]: file,
      }));

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrls((prev) => ({
          ...prev,
          [type]: e.target.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (type) => {
    setFiles((prev) => ({
      ...prev,
      [type]: null,
    }));
    setPreviewUrls((prev) => ({
      ...prev,
      [type]: null,
    }));

    // Reset file input
    if (type === "header_image" && headerFileRef.current) {
      headerFileRef.current.value = "";
    } else if (type === "footer_image" && footerFileRef.current) {
      footerFileRef.current.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!formData.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      type: formData.type,
      company_name: formData.company_name.trim(),
      company_address: formData.company_address.trim() || null,
      company_phone: formData.company_phone.trim() || null,
      company_email: formData.company_email.trim() || null,
      company_website: formData.company_website.trim() || null,
      company_gst: formData.company_gst.trim() || null,
      terms_and_conditions: formData.terms_and_conditions.trim() || null,
      is_active: formData.is_active,
      is_default: formData.is_default,
    };

    mutation.mutate(submitData);
  };

  if (isEditing && templateLoading) {
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
            variant="outline"
            onClick={() => navigate("/settings/templates")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditing ? "Edit Template" : "Create New Template"}
            </h1>
            <p className="text-gray-600">
              {isEditing
                ? "Update template design and settings"
                : "Create a new document template with custom branding"}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter template name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Template Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boq">BOQ Template</SelectItem>
                      <SelectItem value="invoice">Invoice Template</SelectItem>
                      <SelectItem value="sales_order">
                        Sales Order Template
                      </SelectItem>
                      <SelectItem value="payment">Payment Template</SelectItem>
                      <SelectItem value="warranty">
                        Warranty Template
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Describe this template's purpose"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        handleInputChange("is_active", checked)
                      }
                    />
                    <Label htmlFor="is_active">Active Template</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) =>
                        handleInputChange("is_default", checked)
                      }
                    />
                    <Label htmlFor="is_default">Set as Default Template</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      handleInputChange("company_name", e.target.value)
                    }
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="company_address">Address</Label>
                  <Textarea
                    id="company_address"
                    value={formData.company_address}
                    onChange={(e) =>
                      handleInputChange("company_address", e.target.value)
                    }
                    placeholder="Enter company address"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="company_phone">Phone</Label>
                  <Input
                    id="company_phone"
                    value={formData.company_phone}
                    onChange={(e) =>
                      handleInputChange("company_phone", e.target.value)
                    }
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="company_email">Email</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email}
                    onChange={(e) =>
                      handleInputChange("company_email", e.target.value)
                    }
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <Label htmlFor="company_website">Website</Label>
                  <Input
                    id="company_website"
                    value={formData.company_website}
                    onChange={(e) =>
                      handleInputChange("company_website", e.target.value)
                    }
                    placeholder="Enter website URL"
                  />
                </div>

                <div>
                  <Label htmlFor="company_gst">GST Number</Label>
                  <Input
                    id="company_gst"
                    value={formData.company_gst}
                    onChange={(e) =>
                      handleInputChange("company_gst", e.target.value)
                    }
                    placeholder="Enter GST number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images and Terms */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Branding & Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Header Image */}
                <div>
                  <Label className="text-sm font-medium">Header Image</Label>
                  <div className="mt-2">
                    {previewUrls.header_image ? (
                      <div className="relative">
                        <img
                          src={previewUrls.header_image}
                          alt="Header preview"
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => removeFile("header_image")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => headerFileRef.current?.click()}
                      >
                        <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload header image
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    )}
                    <input
                      ref={headerFileRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileChange("header_image", e.target.files?.[0])
                      }
                    />
                  </div>
                </div>

                {/* Footer Image */}
                <div>
                  <Label className="text-sm font-medium">Footer Image</Label>
                  <div className="mt-2">
                    {previewUrls.footer_image ? (
                      <div className="relative">
                        <img
                          src={previewUrls.footer_image}
                          alt="Footer preview"
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => removeFile("footer_image")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => footerFileRef.current?.click()}
                      >
                        <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload footer image
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    )}
                    <input
                      ref={footerFileRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileChange("footer_image", e.target.files?.[0])
                      }
                    />
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div>
                  <Label htmlFor="terms_and_conditions">
                    Terms & Conditions
                  </Label>
                  <Textarea
                    id="terms_and_conditions"
                    value={formData.terms_and_conditions}
                    onChange={(e) =>
                      handleInputChange("terms_and_conditions", e.target.value)
                    }
                    placeholder="Enter terms and conditions"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/settings/templates")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="min-w-[120px]"
              >
                {mutation.isPending
                  ? "Saving..."
                  : isEditing
                    ? "Update Template"
                    : "Create Template"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TemplateForm;
