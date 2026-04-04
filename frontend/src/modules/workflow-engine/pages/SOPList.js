import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchSOPs, deleteSOP } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Plus, Edit, Trash2, GitBranch } from "lucide-react";
import { toast } from "sonner";

const MODULE_OPTIONS = [
  { value: "", label: "All Modules" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "inventory", label: "Inventory" },
];

const MODULE_COLORS = {
  sales: "bg-blue-100 text-blue-800",
  support: "bg-purple-100 text-purple-800",
  inventory: "bg-green-100 text-green-800",
};

const SOPList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [moduleFilter, setModuleFilter] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState(null);

  const params = {};
  if (moduleFilter) params.module = moduleFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["sops", params],
    queryFn: () => fetchSOPs(params),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSOP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      toast.success("SOP deleted successfully");
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to delete SOP");
    },
  });

  const sops = data?.items || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SOP Workflows</h1>
            <p className="text-muted-foreground mt-1">
              Define standard operating procedures for each module
            </p>
          </div>
          <Button onClick={() => navigate("/settings/workflows/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New SOP
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              {MODULE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SOP Cards */}
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : sops.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No SOPs found</p>
              <p className="text-muted-foreground">
                Create your first SOP workflow to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sops.map((sop) => (
              <Card key={sop.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{sop.name}</h3>
                      {sop.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {sop.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={`text-xs ${
                        MODULE_COLORS[sop.module] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {sop.module}
                    </Badge>
                  </div>

                  {/* Pipeline preview */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {(sop.states || [])
                      .sort((a, b) => a.position - b.position)
                      .map((state, idx) => (
                        <React.Fragment key={state.id}>
                          {idx > 0 && (
                            <span className="text-muted-foreground text-xs">
                              →
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{
                              backgroundColor: state.color || "#6B7280",
                            }}
                          >
                            {state.name}
                          </span>
                        </React.Fragment>
                      ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      v{sop.version} · {(sop.states || []).length} states ·{" "}
                      {(sop.transitions || []).length} transitions
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(`/settings/workflows/${sop.id}/edit`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(sop)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete SOP?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate &quot;{deleteTarget?.name}&quot;. Records
                already using this SOP will keep their current state.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default SOPList;
