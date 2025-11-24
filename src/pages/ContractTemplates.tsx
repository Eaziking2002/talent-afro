import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Plus, Trash2, Edit, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface Template {
  id: string;
  name: string;
  description: string | null;
  default_terms: string | null;
  default_duration_days: number | null;
  default_currency: string;
  milestones: any[];
  created_at: string;
}

interface MilestoneInput {
  title: string;
  description: string;
  percentage: number;
}

const ContractTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultTerms, setDefaultTerms] = useState("");
  const [defaultDurationDays, setDefaultDurationDays] = useState("30");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: "", description: "", percentage: 0 },
  ]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("employer_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as Template[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDefaultTerms("");
    setDefaultDurationDays("30");
    setMilestones([{ title: "", description: "", percentage: 0 }]);
    setEditingTemplate(null);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || "");
    setDefaultTerms(template.default_terms || "");
    setDefaultDurationDays(template.default_duration_days?.toString() || "30");
    setMilestones(template.milestones.length > 0 ? template.milestones : [{ title: "", description: "", percentage: 0 }]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast({
          title: "Validation Error",
          description: "Milestone percentages must add up to 100%",
          variant: "destructive",
        });
        return;
      }

      const templateData = {
        employer_id: profile.id,
        name,
        description: description || null,
        default_terms: defaultTerms || null,
        default_duration_days: parseInt(defaultDurationDays) || null,
        milestones: milestones.filter((m) => m.title.trim()) as any,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("contract_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast({ title: "Success", description: "Template updated successfully" });
      } else {
        const { error } = await supabase
          .from("contract_templates")
          .insert(templateData);

        if (error) throw error;
        toast({ title: "Success", description: "Template created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Template deleted successfully" });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: "", description: "", percentage: 0 }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Contract Templates</h1>
            <p className="text-lg text-muted-foreground">
              Create reusable contract structures for faster onboarding
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Web Development Project"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of when to use this template..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Default Duration (Days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={defaultDurationDays}
                    onChange={(e) => setDefaultDurationDays(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Default Terms</Label>
                  <Textarea
                    id="terms"
                    value={defaultTerms}
                    onChange={(e) => setDefaultTerms(e.target.value)}
                    placeholder="Standard terms and conditions..."
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Milestones</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Milestone
                    </Button>
                  </div>

                  {milestones.map((milestone, index) => (
                    <Card key={index}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Milestone {index + 1}</span>
                          {milestones.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMilestone(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            value={milestone.title}
                            onChange={(e) => updateMilestone(index, "title", e.target.value)}
                            placeholder="Milestone title"
                          />
                          <Input
                            type="number"
                            value={milestone.percentage}
                            onChange={(e) => updateMilestone(index, "percentage", parseFloat(e.target.value) || 0)}
                            placeholder="% of total"
                            min="0"
                            max="100"
                          />
                        </div>

                        <Textarea
                          value={milestone.description}
                          onChange={(e) => updateMilestone(index, "description", e.target.value)}
                          placeholder="Milestone description"
                          rows={2}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  <div className="text-sm text-muted-foreground">
                    Total: {milestones.reduce((sum, m) => sum + m.percentage, 0).toFixed(1)}% (must equal 100%)
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!name.trim()}>
                  {editingTemplate ? "Update" : "Create"} Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No templates yet</p>
                <Button onClick={() => setDialogOpen(true)}>
                  Create Your First Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{template.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Duration:</span> {template.default_duration_days || "N/A"} days
                    </p>
                    <p>
                      <span className="font-medium">Milestones:</span> {template.milestones.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ContractTemplates;
