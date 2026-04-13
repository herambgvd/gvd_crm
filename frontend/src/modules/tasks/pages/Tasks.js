import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components";
import { fetchTasks, deleteTask } from "../api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Plus,
  Calendar,
  Search,
  Trash2,
  Edit,
  Eye,
  Users,
  MessageSquare,
  CheckSquare,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  done: { label: "Done", color: "bg-green-100 text-green-700" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  high: { label: "High", color: "bg-red-100 text-red-700" },
};

const Tasks = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [tab, setTab] = React.useState("all"); // all | mine | collaborating

  const params = {};
  if (search) params.search = search;
  if (statusFilter !== "all") params.status = statusFilter;
  if (priorityFilter !== "all") params.priority = priorityFilter;
  if (tab !== "all") params.filter_type = tab;

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", params],
    queryFn: () => fetchTasks(params),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const tasks = data?.items || [];

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === "done") return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage your todos and collaborate with team</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/tasks/calendar")}>
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Calendar
            </Button>
            <Button size="sm" onClick={() => navigate("/tasks/new")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Task
            </Button>
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg w-fit">
          {[
            { key: "all", label: "All" },
            { key: "mine", label: "Created by Me" },
            { key: "collaborating", label: "Collaborating" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="rounded-full bg-muted p-3 w-12 h-12 mx-auto flex items-center justify-center mb-3">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs text-muted-foreground">Create your first task to get started</p>
          </div>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <Card
                key={task.id}
                className="group border-border/60 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold line-clamp-2 flex-1">{task.title}</h3>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); navigate(`/tasks/edit/${task.id}`); }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Delete this task?")) deleteMutation.mutate(task.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={`text-[10px] ${STATUS_CONFIG[task.status]?.color || ""}`}>
                      {STATUS_CONFIG[task.status]?.label || task.status}
                    </Badge>
                    <Badge className={`text-[10px] ${PRIORITY_CONFIG[task.priority]?.color || ""}`}>
                      {PRIORITY_CONFIG[task.priority]?.label || task.priority}
                    </Badge>
                    {task.labels?.map((l) => (
                      <Badge key={l} variant="outline" className="text-[10px]">
                        {l}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue(task.due_date, task.status) ? "text-red-600 font-medium" : ""}`}>
                        <Clock className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.collaborators?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {task.collaborators.length}
                      </span>
                    )}
                    {task.checklist?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
                      </span>
                    )}
                    {task.comment_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {task.comment_count}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tasks;
