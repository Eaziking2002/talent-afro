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
import { Plus, Briefcase, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface WorkExperience {
  id: string;
  company_name: string;
  job_title: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  location: string | null;
}

interface Props {
  items: WorkExperience[];
  profileId: string;
  userId: string;
  isOwner: boolean;
  onRefresh: () => void;
}

export const WorkExperienceSection = ({ items, profileId, userId, isOwner, onRefresh }: Props) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: "",
    job_title: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
    location: "",
  });

  const resetForm = () => {
    setForm({ company_name: "", job_title: "", start_date: "", end_date: "", is_current: false, description: "", location: "" });
    setEditId(null);
  };

  const openEdit = (item: WorkExperience) => {
    setForm({
      company_name: item.company_name,
      job_title: item.job_title,
      start_date: item.start_date,
      end_date: item.end_date || "",
      is_current: item.is_current,
      description: item.description || "",
      location: item.location || "",
    });
    setEditId(item.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_name || !form.job_title || !form.start_date) {
      toast.error("Company, title, and start date are required");
      return;
    }
    setSaving(true);
    try {
      const data = {
        profile_id: profileId,
        user_id: userId,
        company_name: form.company_name,
        job_title: form.job_title,
        start_date: form.start_date,
        end_date: form.is_current ? null : (form.end_date || null),
        is_current: form.is_current,
        description: form.description || null,
        location: form.location || null,
      };

      if (editId) {
        const { error } = await supabase.from("work_experience").update(data).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("work_experience").insert(data);
        if (error) throw error;
      }

      toast.success(editId ? "Experience updated" : "Experience added");
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
      const { error } = await supabase.from("work_experience").delete().eq("id", id);
      if (error) throw error;
      toast.success("Experience removed");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-muted-foreground" /> Work Experience
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
                <DialogTitle>{editId ? "Edit" : "Add"} Work Experience</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Company *</Label>
                    <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Job Title *</Label>
                    <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start Date *</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} disabled={form.is_current} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.is_current} onCheckedChange={(c) => setForm({ ...form, is_current: !!c })} id="is_current" />
                  <Label htmlFor="is_current" className="text-sm">I currently work here</Label>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "Saving…" : editId ? "Update" : "Add Experience"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No work experience added yet</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="relative border-l-2 border-primary/20 pl-4 pb-2 group">
                <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{item.job_title}</h4>
                    <p className="text-sm text-muted-foreground">{item.company_name}{item.location ? ` · ${item.location}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(item.start_date), "MMM yyyy")} – {item.is_current ? "Present" : item.end_date ? format(new Date(item.end_date), "MMM yyyy") : ""}
                    </p>
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

export const WorkExperienceSkeleton = () => (
  <Card>
    <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
    <CardContent className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="border-l-2 border-muted pl-4 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </CardContent>
  </Card>
);
