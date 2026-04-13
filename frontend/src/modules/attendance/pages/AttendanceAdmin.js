import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchAllAttendance, exportAttendance } from "../api";
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
import { ArrowLeft, Download, MapPin } from "lucide-react";

const formatTime = (dt) => (dt ? new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—");
const formatDate = (s) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

const AttendanceAdmin = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userFilter, setUserFilter] = useState("all");

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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AttendanceAdmin;
