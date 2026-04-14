import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { punchIn, punchOut, fetchToday } from "../api";
import { LogIn, LogOut, Check } from "lucide-react";
import { toast } from "sonner";
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

const getLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 5000, enableHighAccuracy: true }
    );
  });

const QuickPunch = () => {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: today } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: fetchToday,
    refetchInterval: 30000,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
  };

  const punchInMut = useMutation({
    mutationFn: async () => {
      const coords = await getLocation();
      return punchIn(coords);
    },
    onSuccess: () => {
      refreshAll();
      toast.success("Punched in");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to punch in"),
  });

  const punchOutMut = useMutation({
    mutationFn: async () => {
      const coords = await getLocation();
      return punchOut(coords);
    },
    onSuccess: (data) => {
      refreshAll();
      toast.success(`Punched out — ${data.total_hours?.toFixed(2) || 0}h`);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to punch out"),
  });

  const hasRecord = today && today.id;
  const isPunchedIn = hasRecord && today.punch_in_at && !today.punch_out_at;
  const isDone = hasRecord && today.punch_out_at;

  if (isDone) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 text-xs font-medium"
        title={`Completed — ${today.total_hours?.toFixed(2)}h`}
      >
        <Check className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Done {today.total_hours?.toFixed(1)}h</span>
      </div>
    );
  }

  if (isPunchedIn) {
    return (
      <>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={punchOutMut.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors disabled:opacity-60"
          title="Punch Out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{punchOutMut.isPending ? "..." : "Punch Out"}</span>
        </button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Punch Out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to punch out? You can only punch in once per day.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setConfirmOpen(false);
                  punchOutMut.mutate();
                }}
              >
                Yes, Punch Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <button
      onClick={() => punchInMut.mutate()}
      disabled={punchInMut.isPending}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors disabled:opacity-60"
      title="Punch In"
    >
      <LogIn className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{punchInMut.isPending ? "..." : "Punch In"}</span>
    </button>
  );
};

export default QuickPunch;
