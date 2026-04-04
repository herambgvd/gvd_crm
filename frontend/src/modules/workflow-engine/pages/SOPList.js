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
import { Plus, Edit, Trash2, GitBranch, Layers } from "lucide-react";
import { toast } from "sonner";

const MODULE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "inventory", label: "Inventory" },
];

const MODULE_COLORS = {
  sales: "bg-blue-50 text-blue-600 border-blue-200",
  support: "bg-violet-50 text-violet-600 border-violet-200",
  inventory: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const SOPList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [deleteTarget, setDeleteTarget] = React.useState(null);

  const params = {};
  if (moduleFilter && moduleFilter !== "all") params.module = moduleFilter;

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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Workflows</h1>
            <p className="text-sm text-muted-foreground">
              Define standard operating procedures for each module
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/settings/workflows/new")}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New SOP
          </Button>
        </div>

        {/* Filter */}
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
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

        {/* SOP Cards */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : sops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No SOPs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first SOP workflow to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sops.map((sop) => (
              <Card
                key={sop.id}
                className="group hover:shadow-sm transition-shadow border border-border/60"
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate">
                        {sop.name}
                      </h3>
                      {sop.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {sop.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 shrink-0 border ${
                        MODULE_COLORS[sop.module] || ""
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
                            <span className="text-muted-foreground text-[10px]">
                              →
                            </span>
                          )}
                          <span
                            className="text-[10px] leading-none px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: state.color || "#6B7280" }}
                          >
                            {state.name}
                          </span>
                        </React.Fragment>
                      ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Layers className="h-3 w-3" />
                      v{sop.version} · {(sop.states || []).length} states ·{" "}
                      {(sop.transitions || []).length} transitions
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          navigate(`/settings/workflows/${sop.id}/edit`)
                        }
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setDeleteTarget(sop)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
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
              <AlertDialogTitle className="text-base">Delete SOP?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
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
