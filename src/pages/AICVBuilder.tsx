import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function AICVBuilder() {
  const [form, setForm] = useState({
    fullName: "", role: "", email: "", phone: "", location: "",
    yearsExperience: 0, skills: "", experience: "", education: "", achievements: "", summary: "",
  });
  const [cv, setCv] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!form.fullName || !form.role) { toast.error("Full name and target role are required"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-cv-builder", {
        body: {
          ...form,
          skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
          yearsExperience: Number(form.yearsExperience) || 0,
        },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      setCv((data as any).cv);
      toast.success("CV generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate CV");
    } finally { setLoading(false); }
  };

  const downloadPdf = () => {
    if (!cv) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const lines = doc.splitTextToSize(cv.replace(/[#*_`>]/g, ""), 500);
    doc.setFontSize(10);
    doc.text(lines, 48, 56);
    doc.save(`${form.fullName.replace(/\s+/g, "_") || "cv"}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-secondary" /> AI CV Builder
          </h1>
          <p className="text-muted-foreground mt-1">Generate a polished, ATS-friendly CV in seconds.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass">
            <CardHeader><CardTitle>Your details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Full name *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
                <div><Label>Target role *</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Senior Frontend Engineer" /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Lagos, Nigeria" /></div>
                <div><Label>Years experience</Label><Input type="number" value={form.yearsExperience} onChange={e => setForm({ ...form, yearsExperience: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Skills (comma separated)</Label><Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, TypeScript, AWS" /></div>
              <div><Label>Professional summary</Label><Textarea rows={2} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
              <div><Label>Experience</Label><Textarea rows={4} value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="Company, role, dates, key achievements..." /></div>
              <div><Label>Education</Label><Textarea rows={2} value={form.education} onChange={e => setForm({ ...form, education: e.target.value })} /></div>
              <div><Label>Achievements</Label><Textarea rows={2} value={form.achievements} onChange={e => setForm({ ...form, achievements: e.target.value })} /></div>
              <Button onClick={generate} disabled={loading} className="w-full bg-emerald-gradient">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate CV</>}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preview</CardTitle>
              {cv && <Button size="sm" variant="outline" onClick={downloadPdf}><Download className="h-4 w-4 mr-1" /> PDF</Button>}
            </CardHeader>
            <CardContent>
              {cv ? (
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">{cv}</pre>
              ) : (
                <p className="text-muted-foreground text-sm">Your generated CV will appear here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
