import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CVUploadProps {
  userId: string;
  value?: string;
  onChange: (url: string | undefined) => void;
}

const ACCEPTED = ".pdf,.doc,.docx";
const MAX_BYTES = 5 * 1024 * 1024;

export function CVUpload({ userId, value, onChange }: CVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileName = value?.split("/").pop()?.split("?")[0] ?? "Your CV";

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "doc", "docx"].includes(ext ?? "")) {
      toast({ title: "Unsupported format", description: "Use PDF or DOCX.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("application-cvs").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      onChange(path);
      toast({ title: "CV uploaded ✓" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (value) {
      await supabase.storage.from("application-cvs").remove([value]).catch(() => {});
    }
    onChange(undefined);
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-secondary/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">CV ready to submit</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={remove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all p-6 text-center cursor-pointer",
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
        uploading && "pointer-events-none opacity-70"
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
      </div>
      <p className="font-medium text-sm">
        {uploading ? "Uploading…" : "Drag your CV here, or click to browse"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">PDF or DOCX · Max 5MB</p>
    </div>
  );
}
