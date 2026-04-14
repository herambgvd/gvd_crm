import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import {
  punchIn,
  punchOut,
  fetchToday,
  fetchMyHistory,
  exportAttendance,
} from "../api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
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
import {
  LogIn,
  LogOut,
  Clock,
  Users,
  Shield,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const formatTime = (dt) => (dt ? new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");
const formatDate = (s) => (s ? new Date(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—");

const getLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
};

const Attendance = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirmPunchOut, setConfirmPunchOut] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: today } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: fetchToday,
    refetchInterval: 30000,
  });

  const { data: history } = useQuery({
    queryKey: ["attendance-history", startDate, endDate],
    queryFn: () => fetchMyHistory({ start_date: startDate || undefined, end_date: endDate || undefined }),
  });

  const punchInMutation = useMutation({
    mutationFn: async () => {
      const coords = await getLocation();
      return punchIn(coords);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      toast.success("Punched in successfully");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to punch in"),
  });

  const punchOutMutation = useMutation({
    mutationFn: async () => {
      const coords = await getLocation();
      return punchOut(coords);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      toast.success("Punched out successfully");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to punch out"),
  });

  const hasRecord = today && today.id;
  const isPunchedIn = hasRecord && today.punch_in_at && !today.punch_out_at;
  const isDone = hasRecord && today.punch_out_at;

  // Running duration for today
  let runningHours = 0;
  if (isPunchedIn) {
    const punchInTime = new Date(today.punch_in_at);
    runningHours = (now - punchInTime) / (1000 * 60 * 60);
  } else if (isDone) {
    runningHours = today.total_hours || 0;
  }

  const hours = Math.floor(runningHours);
  const minutes = Math.floor((runningHours - hours) * 60);

  const records = history?.items || [];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>
            <p className="text-sm text-muted-foreground">Mark your attendance and track hours</p>
          </div>
          <div className="flex gap-2">
            {(user?.is_superuser) && (
              <Button variant="outline" size="sm" onClick={() => navigate("/attendance/admin")}>
                <Shield className="mr-1.5 h-3.5 w-3.5" /> Admin View
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/attendance/team")}>
              <Users className="mr-1.5 h-3.5 w-3.5" /> Team View
            </Button>
          </div>
        </div>

        {/* Punch card */}
        <Card className="border-border/60">
          <CardContent className="p-6">
            <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
              <div className="text-center">
                <div className="text-4xl font-bold tracking-tight tabular-nums">
                  {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {!hasRecord && (
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => punchInMutation.mutate()}
                    disabled={punchInMutation.isPending}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {punchInMutation.isPending ? "Punching in..." : "Punch In"}
                  </Button>
                )}

                {isPunchedIn && (
                  <>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Punched in at </span>
                      <span className="font-medium">{formatTime(today.punch_in_at)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Working for <span className="font-semibold text-foreground tabular-nums">{hours}h {minutes}m</span>
                    </div>
                    <Button
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => setConfirmPunchOut(true)}
                      disabled={punchOutMutation.isPending}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {punchOutMutation.isPending ? "Punching out..." : "Punch Out"}
                    </Button>
                  </>
                )}

                {isDone && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-green-600 tabular-nums">
                        {hours}h {minutes}m
                      </div>
                      <span className="text-xs text-muted-foreground">Total today</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(today.punch_in_at)} → {formatTime(today.punch_out_at)}
                    </div>
                    <p className="text-[11px] text-green-600 font-medium">✓ Attendance completed for today</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">My History</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => exportAttendance({ scope: "my", start_date: startDate || undefined, end_date: endDate || undefined })}
              >
                <Download className="h-3 w-3 mr-1" /> Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-md">
              <div>
                <Label className="text-[10px]">From</Label>
                <Input type="date" className="h-8 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px]">To</Label>
                <Input type="date" className="h-8 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {records.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No records yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border/40">
                    <tr className="text-left">
                      <th className="py-2 font-medium text-muted-foreground">Date</th>
                      <th className="py-2 font-medium text-muted-foreground">Punch In</th>
                      <th className="py-2 font-medium text-muted-foreground">Punch Out</th>
                      <th className="py-2 font-medium text-muted-foreground text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-b border-border/20 hover:bg-muted/30">
                        <td className="py-2 font-medium">{formatDate(r.date)}</td>
                        <td className="py-2 tabular-nums">{formatTime(r.punch_in_at)}</td>
                        <td className="py-2 tabular-nums">{formatTime(r.punch_out_at)}</td>
                        <td className="py-2 text-right tabular-nums font-medium">
                          {r.total_hours ? `${r.total_hours.toFixed(2)}h` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Punch out confirmation */}
        <AlertDialog open={confirmPunchOut} onOpenChange={setConfirmPunchOut}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Punch Out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to punch out? You worked{" "}
                <strong className="text-foreground">{hours}h {minutes}m</strong> today.
                You can only punch in once per day.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setConfirmPunchOut(false);
                  punchOutMutation.mutate();
                }}
              >
                Yes, Punch Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Attendance;
