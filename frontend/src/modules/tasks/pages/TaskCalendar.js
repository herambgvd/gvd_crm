import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchCalendarTasks } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, List } from "lucide-react";

const STATUS_COLORS = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
};

const TaskCalendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate month range
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-calendar", year, month],
    queryFn: () => fetchCalendarTasks(monthStart.toISOString(), monthEnd.toISOString()),
  });

  // Group tasks by date (YYYY-MM-DD)
  const tasksByDate = React.useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = t.due_date.substring(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const weeks = [];
  let currentWeek = Array(firstDayOfMonth).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const dateKey = (day) =>
    day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;

  const selectedTasks = selectedDate ? tasksByDate[selectedDate] || [] : [];

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Task Calendar</h1>
            <p className="text-sm text-muted-foreground">View and manage tasks by date</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/tasks")}>
              <List className="mr-1.5 h-3.5 w-3.5" /> List View
            </Button>
            <Button size="sm" onClick={() => navigate("/tasks/new")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Task
            </Button>
          </div>
        </div>

        {/* Layout: 70% calendar / 30% day panel */}
        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
          {/* Calendar */}
          <Card className="border-border/60">
            <CardContent className="p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-semibold">{monthName}</h2>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setCurrentDate(new Date()); setSelectedDate(todayKey); }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((day, i) => {
                  const key = dateKey(day);
                  const dayTasks = key ? tasksByDate[key] || [] : [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;

                  return (
                    <button
                      key={i}
                      disabled={!day}
                      onClick={() => key && setSelectedDate(key)}
                      className={`aspect-square p-1.5 rounded-md border transition-all text-left ${
                        !day
                          ? "invisible"
                          : isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : isToday
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/40 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                          {day}
                        </span>
                        {dayTasks.length > 0 && (
                          <div className="mt-auto flex gap-0.5 flex-wrap">
                            {dayTasks.slice(0, 3).map((t) => (
                              <div
                                key={t.id}
                                className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[t.status] || "bg-gray-400"}`}
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day panel */}
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "Select a date"}
              </p>

              {!selectedDate && (
                <p className="text-xs text-muted-foreground">Click a date to see tasks</p>
              )}

              {selectedDate && selectedTasks.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground mb-2">No tasks on this day</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/tasks/new?due_date=${selectedDate}`)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Task
                  </Button>
                </div>
              )}

              {selectedTasks.length > 0 && (
                <div className="space-y-2">
                  {selectedTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/tasks/${t.id}`)}
                      className="p-2 rounded-md border border-border/40 hover:border-border cursor-pointer text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_COLORS[t.status]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.title}</p>
                          {t.collaborators?.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {t.collaborator_names?.filter(Boolean).join(", ") || `${t.collaborators.length} collaborators`}
                            </p>
                          )}
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                              {t.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                              {t.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default TaskCalendar;
