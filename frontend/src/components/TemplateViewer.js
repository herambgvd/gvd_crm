import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { X, Edit, Image, FileText } from "lucide-react";
import { format } from "date-fns";

const TemplateViewer = ({ template, isOpen, onClose, onEdit }) => {
  if (!template) return null;

  const templateType = template.type || "unknown";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-semibold">
              {template.name}
            </DialogTitle>
            <DialogDescription>
              Template Preview - {templateType.replace("_", " ").toUpperCase()}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(template.id);
                  onClose();
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Type
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline" className="capitalize">
                      {templateType.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <div className="mt-1 flex gap-2">
                    <Badge
                      variant={template.is_active ? "default" : "secondary"}
                      className={`${
                        template.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {template.is_default && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {template.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <p className="mt-1 text-sm text-gray-700">
                    {template.description}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Created
                </label>
                <p className="mt-1 text-sm text-gray-700">
                  {format(
                    new Date(template.created_at),
                    "MMM dd, yyyy at h:mm a",
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.company_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Company Name
                    </label>
                    <p className="mt-1 text-sm text-gray-700">
                      {template.company_name}
                    </p>
                  </div>
                )}
                {template.company_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Email
                    </label>
                    <p className="mt-1 text-sm text-gray-700">
                      {template.company_email}
                    </p>
                  </div>
                )}
                {template.company_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Phone
                    </label>
                    <p className="mt-1 text-sm text-gray-700">
                      {template.company_phone}
                    </p>
                  </div>
                )}
                {template.company_website && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Website
                    </label>
                    <p className="mt-1 text-sm text-gray-700">
                      {template.company_website}
                    </p>
                  </div>
                )}
              </div>
              {template.company_address && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Address
                  </label>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                    {template.company_address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Header & Footer Images */}
          {(template.header_image_url || template.footer_image_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Template Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.header_image_url && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">
                      Header Image
                    </label>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img
                        src={`${
                          process.env.REACT_APP_BACKEND_URL ||
                          "http://localhost:8000"
                        }${template.header_image_url}`}
                        alt="Header"
                        className="max-w-full h-auto max-h-32 mx-auto rounded"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                      />
                      <div
                        style={{ display: "none" }}
                        className="text-center text-gray-500 py-8"
                      >
                        <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Header image not found</p>
                      </div>
                    </div>
                  </div>
                )}
                {template.footer_image_url && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">
                      Footer Image
                    </label>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img
                        src={`${
                          process.env.REACT_APP_BACKEND_URL ||
                          "http://localhost:8000"
                        }${template.footer_image_url}`}
                        alt="Footer"
                        className="max-w-full h-auto max-h-32 mx-auto rounded"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                      />
                      <div
                        style={{ display: "none" }}
                        className="text-center text-gray-500 py-8"
                      >
                        <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Footer image not found</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Terms and Conditions */}
          {template.terms_and_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms and Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {template.terms_and_conditions}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateViewer;
