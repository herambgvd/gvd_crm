import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchDocuments, uploadDocument, BACKEND_URL } from "../api";
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
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Plus, FileText, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Documents = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [entityType, setEntityType] = useState("general");
  const [entityId, setEntityId] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocuments(null, null),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, type, id }) => uploadDocument(file, type, id),
    onSuccess: () => {
      queryClient.invalidateQueries(["documents"]);
      toast.success("Document uploaded successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to upload document");
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setEntityType("general");
    setEntityId("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }
    uploadMutation.mutate({
      file: selectedFile,
      type: entityType,
      id: entityId,
    });
  };

  const getEntityBadge = (type) => {
    const variants = {
      boq: "bg-blue-50 text-blue-700 ring-blue-600/20",
      quotation: "bg-purple-50 text-purple-700 ring-purple-600/20",
      po: "bg-green-50 text-green-700 ring-green-600/20",
      invoice: "bg-orange-50 text-orange-700 ring-orange-600/20",
      general: "bg-gray-50 text-gray-700 ring-gray-600/20",
    };
    return (
      <Badge className={`${variants[type]} ring-1 ring-inset`}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
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
      <div className="space-y-6" data-testid="documents-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Documents
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage all PDF documents and attachments
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="upload-document-btn">
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-testid="document-form"
              >
                <div>
                  <Label htmlFor="file">PDF File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    required
                    data-testid="file-input"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="entity_type">Document Type</Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger data-testid="entity-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="boq">BOQ</SelectItem>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="po">Purchase Order</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entity_id">
                    Related Entity ID (Optional)
                  </Label>
                  <Input
                    id="entity_id"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="e.g., BOQ ID, Order ID"
                    data-testid="entity-id-input"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    data-testid="submit-document-btn"
                  >
                    Upload
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents?.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  No documents found. Upload your first document!
                </p>
              </CardContent>
            </Card>
          ) : (
            documents?.map((doc) => (
              <Card
                key={doc.id}
                className="border border-gray-200 hover:shadow-md transition-all"
                data-testid="document-card"
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-md">
                        <FileText className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm font-heading truncate">
                          {doc.file_name}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono mt-1">
                          {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getEntityBadge(doc.entity_type)}
                      {doc.entity_id && (
                        <Badge variant="outline" className="font-mono text-xs">
                          ID: {doc.entity_id.slice(0, 8)}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 font-mono">
                      {format(new Date(doc.uploaded_at), "MMM dd, yyyy HH:mm")}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          window.open(`${BACKEND_URL}${doc.file_url}`, "_blank")
                        }
                        data-testid="view-document-btn"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = `${BACKEND_URL}${doc.file_url}`;
                          link.download = doc.file_name;
                          link.click();
                        }}
                        data-testid="download-document-btn"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Documents;
