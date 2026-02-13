import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Shield, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import DocumentUploadCard from "./DocumentUploadCard";

interface Verification {
  id: string;
  document_type: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface VerificationUploadFormProps {
  verifications: Verification[];
  onSubmitted: () => void;
}

const DOC_TYPES = [
  { value: "national_id", label: "National ID Card", needsBack: true },
  { value: "passport", label: "Passport", needsBack: false },
  { value: "drivers_license", label: "Driver's License", needsBack: true },
  { value: "business_registration", label: "Business Registration", needsBack: true },
  { value: "cv", label: "CV / Resume (PDF)", needsBack: false },
];

export default function VerificationUploadForm({ verifications, onSubmitted }: VerificationUploadFormProps) {
  const [docType, setDocType] = useState("national_id");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const selectedDoc = DOC_TYPES.find((d) => d.value === docType)!;
  const isCv = docType === "cv";

  const handleFrontSelect = (file: File) => {
    setFrontFile(file);
    if (file.type.startsWith("image/")) {
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setFrontPreview("pdf");
    }
  };

  const handleBackSelect = (file: File) => {
    setBackFile(file);
    if (file.type.startsWith("image/")) {
      setBackPreview(URL.createObjectURL(file));
    } else {
      setBackPreview("pdf");
    }
  };

  const removeFront = () => {
    setFrontFile(null);
    if (frontPreview && frontPreview !== "pdf") URL.revokeObjectURL(frontPreview);
    setFrontPreview(null);
  };

  const removeBack = () => {
    setBackFile(null);
    if (backPreview && backPreview !== "pdf") URL.revokeObjectURL(backPreview);
    setBackPreview(null);
  };

  const uploadFile = async (file: File, userId: string, side: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const path = `${userId}/${docType}_${side}_${timestamp}_${randomId}.${ext}`;

    const { error } = await supabase.storage
      .from("verification-docs")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    if (!frontFile) {
      toast.error(isCv ? "Please upload your CV" : "Please upload the front of your document");
      return;
    }
    if (selectedDoc.needsBack && !backFile) {
      toast.error("Please upload the back of your document");
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      setProgress(30);
      const frontPath = await uploadFile(frontFile, user.id, "front");

      setProgress(60);
      let backPath: string | null = null;
      if (backFile) {
        backPath = await uploadFile(backFile, user.id, "back");
      }

      setProgress(80);

      const { error } = await supabase
        .from("identity_verifications")
        .insert({
          user_id: user.id,
          document_type: docType,
          front_image_url: frontPath,
          back_image_url: backPath,
          status: "pending",
        });

      if (error) throw error;

      setProgress(100);
      toast.success("Verification submitted for review!");
      removeFront();
      removeBack();
      setDocType("national_id");
      onSubmitted();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved": return "default" as const;
      case "rejected": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Identity Verification
          </CardTitle>
          <CardDescription>
            Upload your documents for verification. All files are stored securely and only accessible by administrators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn("grid gap-4", selectedDoc.needsBack ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md")}>
            <DocumentUploadCard
              label={isCv ? "Upload CV" : "Front Side"}
              description={isCv ? "Upload your resume in PDF format" : "Upload a clear photo of the front"}
              file={frontFile}
              previewUrl={frontPreview}
              onFileSelect={handleFrontSelect}
              onRemove={removeFront}
              accept={isCv ? "application/pdf" : "image/jpeg,image/png"}
              required
            />
            {selectedDoc.needsBack && (
              <DocumentUploadCard
                label="Back Side"
                description="Upload a clear photo of the back"
                file={backFile}
                previewUrl={backPreview}
                onFileSelect={handleBackSelect}
                onRemove={removeBack}
                accept="image/jpeg,image/png"
                required
              />
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={uploading || !frontFile || (selectedDoc.needsBack && !backFile)}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Submit for Verification"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Submission History */}
      {verifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verification History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verifications.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(v.status)}
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {v.document_type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusVariant(v.status)}>{v.status}</Badge>
                    {v.admin_notes && v.status === "rejected" && (
                      <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">
                        {v.admin_notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
