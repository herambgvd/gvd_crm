import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchAllAttendance, exportAttendance, updateAttendanceRecord, deleteAttendanceRecord } from "../api";
import { fetchUsers } from "../../settings/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { ArrowLeft, Download, MapPin, Edit, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// Convert UTC ISO string to local datetime-local input format
const isoToLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Convert datetime-local input to ISO string
const localInputToIso = (local) => {
  if (!local) return null;
  return new Date(local).toISOString();
};

const formatTime = (dt) => (dt ? new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—");
const formatDate = (s) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

const AttendanceAdmin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [editing, setEditing] = useState(null); // record being edited
  const [editForm, setEditForm] = useState({ punch_in_at: "", punch_out_at: "" });

  useEffect(() => {
    if (editing) {
      setEditForm({
        punch_in_at: isoToLocalInput(editing.punch_in_at),
        punch_out_at: isoToLocalInput(editing.punch_out_at),
      });
    }
  }, [editing]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAttendanceRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      toast.success("Record updated");
      setEditing(null);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to update"),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => deleteAttendanceRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      toast.success("Record reset. User can punch in again.");
      setEditing(null);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to reset"),
  });

  const handleSaveEdit = () => {
    if (!editing) return;
    const payload = {};
    if (editForm.punch_in_at) payload.punch_in_at = localInputToIso(editForm.punch_in_at);
    if (editForm.punch_out_at) payload.punch_out_at = localInputToIso(editForm.punch_out_at);
    updateMutation.mutate({ id: editing.id, data: payload });
  };

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const params = { page_size: 200 };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (userFilter !== "all") params.user_id = userFilter;

  const { data } = useQuery({
    queryKey: ["attendance-all", params],
    queryFn: () => fetchAllAttendance(params),
  });

  const records = data?.items || [];

  const getLocationUrl = (loc) => {
    if (!loc?.lat || !loc?.lng) return null;
    return `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Attendance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAttendance({ scope: "all", ...params, page_size: undefined })}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>

        <div>
          <h1 className="text-xl font-semibold tracking-tight">All Attendance</h1>
          <p className="text-sm text-muted-foreground">Admin view — all users' attendance records</p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" className="h-9 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" className="h-9 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No attendance records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border/40">
                    <tr className="text-left">
                      <th className="py-2 font-medium text-muted-foreground">Date</th>
                      <th className="py-2 font-medium text-muted-foreground">User</th>
                      <th className="py-2 font-medium text-muted-foreground">Punch In</th>
                      <th className="py-2 font-medium text-muted-foreground">Punch Out</th>
                      <th className="py-2 font-medium text-muted-foreground">Location</th>
                      <th className="py-2 font-medium text-muted-foreground text-right">Hours</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const inLoc = getLocationUrl(r.punch_in_location);
                      return (
                        <tr key={r.id} className="border-b border-border/20 hover:bg-muted/30">
                          <td className="py-2 font-medium">{formatDate(r.date)}</td>
                          <td className="py-2">{r.user_name}</td>
                          <td className="py-2 tabular-nums">{formatTime(r.punch_in_at)}</td>
                          <td className="py-2 tabular-nums">{formatTime(r.punch_out_at)}</td>
                          <td className="py-2">
                            {inLoc ? (
                              <a href={inLoc} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> View
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 text-right tabular-nums font-medium">
                            {r.total_hours ? `${r.total_hours.toFixed(2)}h` : "—"}
                          </td>
                          <td className="py-2 text-right">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(r)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Edit Attendance Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {editing && (
                <div className="text-xs text-muted-foreground">
                  <p><strong className="text-foreground">{editing.user_name}</strong> — {formatDate(editing.date)}</p>
                </div>
              )}
              <div>
                <Label className="text-xs">Punch In</Label>
                <Input
                  type="datetime-local"
                  className="h-9 text-sm"
                  value={editForm.punch_in_at}
                  onChange={(e) => setEditForm({ ...editForm, punch_in_at: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Punch Out</Label>
                <Input
                  type="datetime-local"
                  className="h-9 text-sm"
                  value={editForm.punch_out_at}
                  onChange={(e) => setEditForm({ ...editForm, punch_out_at: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty to clear punch out (record stays open).
                </p>
              </div>
            </div>
            <DialogFooter className="flex-row sm:justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm("Reset this record? The user will be able to punch in again for this day.")) {
                    resetMutation.mutate(editing.id);
                  }
                }}
                disabled={resetMutation.isPending}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {resetMutation.isPending ? "Resetting..." : "Reset"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AttendanceAdmin;
