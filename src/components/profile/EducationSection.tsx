import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

interface Props {
  items: Education[];
  profileId: string;
  userId: string;
  isOwner: boolean;
  onRefresh: () => void;
}

export const EducationSection = ({ items, profileId, userId, isOwner, onRefresh }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    institution: "",
    degree: "",
    field_of_study: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  });

  const resetForm = () => {
    setForm({ institution: "", degree: "", field_of_study: "", start_date: "", end_date: "", is_current: false, description: "" });
    setEditId(null);
  };

  const openEdit = (item: Education) => {
    setForm({
      institution: item.institution,
      degree: item.degree,
      field_of_study: item.field_of_study || "",
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      is_current: item.is_current,
      description: item.description || "",
    });
    setEditId(item.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.institution || !form.degree) {
      toast.error("Institution and degree are required");
      return;
    }
    setSaving(true);
    try {
      const data = {
        profile_id: profileId,
        user_id: userId,
        institution: form.institution,
        degree: form.degree,
        field_of_study: form.field_of_study || null,
        start_date: form.start_date || null,
        end_date: form.is_current ? null : (form.end_date || null),
        is_current: form.is_current,
        description: form.description || null,
      };

      if (editId) {
        const { error } = await supabase.from("education").update(data).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("education").insert(data);
        if (error) throw error;
      }

      toast.success(editId ? "Education updated" : "Education added");
      resetForm();
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("education").delete().eq("id", id);
      if (error) throw error;
      toast.success("Education removed");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" /> Education
        </CardTitle>
        {isOwner && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit" : "Add"} Education</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Institution *</Label>
                  <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Degree *</Label>
                    <Input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="e.g., BSc" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Field of Study</Label>
                    <Input value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} placeholder="e.g., Computer Science" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} disabled={form.is_current} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.is_current} onCheckedChange={(c) => setForm({ ...form, is_current: !!c })} id="edu_current" />
                  <Label htmlFor="edu_current" className="text-sm">Currently studying here</Label>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "Saving…" : editId ? "Update" : "Add Education"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No education added yet</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="relative border-l-2 border-secondary/30 pl-4 pb-2 group">
                <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-secondary" />
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{item.degree}{item.field_of_study ? ` in ${item.field_of_study}` : ""}</h4>
                    <p className="text-sm text-muted-foreground">{item.institution}</p>
                    {item.start_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(item.start_date), "yyyy")} – {item.is_current ? "Present" : item.end_date ? format(new Date(item.end_date), "yyyy") : ""}
                      </p>
                    )}
                    {item.description && <p className="text-sm mt-1.5 text-muted-foreground">{item.description}</p>}
                  </div>
                  {isOwner && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const EducationSkeleton = () => (
  <Card>
    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
    <CardContent className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="border-l-2 border-muted pl-4 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </CardContent>
  </Card>
);
