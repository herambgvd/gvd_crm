import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../../../components";
import { fetchTask, createTask, updateTask } from "../api";
import { fetchUsers } from "../../settings/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ArrowLeft, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TaskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: searchParams.get("due_date") || "",
    status: "todo",
    priority: "medium",
    labels: [],
    collaborators: [],
    checklist: [],
  });

  const [newLabel, setNewLabel] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["task", id],
    queryFn: () => fetchTask(id),
    enabled: isEdit,
  });

  const { data: usersList = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || "",
        description: existing.description || "",
        due_date: existing.due_date ? existing.due_date.substring(0, 10) : "",
        status: existing.status || "todo",
        priority: existing.priority || "medium",
        labels: existing.labels || [],
        collaborators: existing.collaborators || [],
        checklist: existing.checklist || [],
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? updateTask(id, payload) : createTask(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(isEdit ? "Task updated" : "Task created");
      navigate("/tasks");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Failed to save task"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = { ...form };
    if (!payload.due_date) delete payload.due_date;
    else payload.due_date = new Date(payload.due_date).toISOString();
    mutation.mutate(payload);
  };

  const addLabel = () => {
    if (newLabel.trim() && !form.labels.includes(newLabel.trim())) {
      setForm({ ...form, labels: [...form.labels, newLabel.trim()] });
      setNewLabel("");
    }
  };

  const removeLabel = (l) => setForm({ ...form, labels: form.labels.filter((x) => x !== l) });

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setForm({
        ...form,
        checklist: [...form.checklist, { text: newChecklistItem.trim(), done: false }],
      });
      setNewChecklistItem("");
    }
  };

  const toggleChecklistItem = (i) => {
    const updated = [...form.checklist];
    updated[i].done = !updated[i].done;
    setForm({ ...form, checklist: updated });
  };

  const removeChecklistItem = (i) => {
    setForm({ ...form, checklist: form.checklist.filter((_, idx) => idx !== i) });
  };

  const toggleCollaborator = (userId) => {
    setForm({
      ...form,
      collaborators: form.collaborators.includes(userId)
        ? form.collaborators.filter((c) => c !== userId)
        : [...form.collaborators, userId],
    });
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Tasks
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isEdit ? "Edit Task" : "New Task"}
              </p>
              <div>
                <Label className="text-xs">Title *</Label>
                <Input
                  className="h-9 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs to be done?"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  className="text-sm resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional details..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labels */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Labels</p>
              <div className="flex gap-2">
                <Input
                  className="h-9 text-sm"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                  placeholder="Add a label"
                />
                <Button type="button" size="sm" variant="outline" onClick={addLabel}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {form.labels.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {form.labels.map((l) => (
                    <Badge key={l} variant="outline" className="text-xs gap-1">
                      {l}
                      <button type="button" onClick={() => removeLabel(l)}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborators */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collaborators</p>
              <p className="text-[11px] text-muted-foreground">
                Selected users can view, edit, and complete this task
              </p>
              <div className="max-h-48 overflow-y-auto border border-border/40 rounded-md divide-y divide-border/40">
                {usersList.map((u) => {
                  const fullName = `${u.name || u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || u.email;
                  const selected = form.collaborators.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCollaborator(u.id)}
                        className="h-3.5 w-3.5 rounded"
                      />
                      <span className="font-medium">{fullName}</span>
                      <span className="text-muted-foreground">{u.email}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Checklist</p>
              <div className="flex gap-2">
                <Input
                  className="h-9 text-sm"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())}
                  placeholder="Add checklist item"
                />
                <Button type="button" size="sm" variant="outline" onClick={addChecklistItem}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {form.checklist.length > 0 && (
                <div className="space-y-1">
                  {form.checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(i)}
                        className="h-3.5 w-3.5 rounded"
                      />
                      <span className={`flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}>
                        {item.text}
                      </span>
                      <button type="button" onClick={() => removeChecklistItem(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/tasks")}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TaskForm;
