import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

interface DocumentUploadCardProps {
  label: string;
  description?: string;
  file: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  accept?: string;
  required?: boolean;
}

export default function DocumentUploadCard({
  label,
  description,
  file,
  previewUrl,
  onFileSelect,
  onRemove,
  accept = "image/jpeg,image/png,application/pdf",
  required = false,
}: DocumentUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): boolean => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Only JPG, PNG, and PDF files are allowed");
      return false;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File size must be under 5MB");
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      if (validateFile(f)) onFileSelect(f);
    },
    [validateFile, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const isPdf = file?.type === "application/pdf";

  return (
    <Card
      className={cn(
        "relative border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/5"
          : previewUrl
          ? "border-border bg-card"
          : "border-muted-foreground/25 bg-muted/30 hover:border-primary/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-1">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mb-3">{description}</p>
        )}

        {previewUrl ? (
          <div className="relative">
            {isPdf ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileText className="h-10 w-10 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {((file?.size || 0) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt={label}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="p-3 rounded-full bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Drag & drop or click to upload
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                Browse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-1" />
                Camera
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              JPG, PNG, PDF • Max 5MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </CardContent>
    </Card>
  );
}
