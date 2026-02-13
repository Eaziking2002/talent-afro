import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  MapPin, CheckCircle, Download, MessageSquare, Briefcase, Eye, EyeOff, Camera, Loader2,
} from "lucide-react";

interface TalentHeaderProps {
  profile: {
    id: string;
    user_id: string;
    full_name: string;
    job_title?: string | null;
    location?: string | null;
    avatar_url?: string | null;
    cover_url?: string | null;
    availability_status?: string | null;
    profile_visibility?: string | null;
    id_verified?: boolean | null;
    cv_url?: string | null;
    bio?: string | null;
    skills?: string[] | null;
    average_rating?: number | null;
    total_reviews?: number | null;
    total_gigs_completed?: number | null;
  };
  completionPercent: number;
  isOwner: boolean;
  onMessage?: () => void;
  onToggleVisibility?: () => void;
  onProfileUpdate?: (updates: Record<string, any>) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export const TalentProfileHeader = ({
  profile,
  completionPercent,
  isOwner,
  onMessage,
  onToggleVisibility,
  onProfileUpdate,
}: TalentHeaderProps) => {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const initials = profile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const isPublic = profile.profile_visibility !== "private";

  const uploadImage = async (
    file: File,
    type: "avatar" | "cover"
  ) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be under 5MB");
      return;
    }

    const setter = type === "avatar" ? setUploadingAvatar : setUploadingCover;
    setter(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.user_id}/${type}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("profile-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path);

      const column = type === "avatar" ? "avatar_url" : "cover_url";
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ [column]: urlData.publicUrl })
        .eq("id", profile.id);

      if (updateErr) throw updateErr;

      onProfileUpdate?.({ [column]: urlData.publicUrl });
      toast.success(`${type === "avatar" ? "Profile" : "Cover"} photo updated!`);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setter(false);
    }
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Cover photo */}
      <div className="relative h-32 sm:h-48 group">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-hero-gradient" />
        )}
        {isOwner && (
          <>
            <button
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/30 transition-colors cursor-pointer"
            >
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white text-sm font-medium bg-foreground/50 px-3 py-1.5 rounded-full">
                {uploadingCover ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {uploadingCover ? "Uploading..." : "Change Cover"}
              </span>
            </button>
            <input
              ref={coverRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f, "cover");
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      <div className="px-4 sm:px-8 pb-6 -mt-16 sm:-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar with upload */}
          <div className="relative group">
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-card shadow-lg">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <>
                <button
                  onClick={() => avatarRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 group-hover:bg-foreground/40 transition-colors cursor-pointer"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </span>
                </button>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, "avatar");
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-2 sm:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{profile.full_name}</h1>
              {profile.id_verified && (
                <Badge variant="secondary" className="gap-1 w-fit text-xs">
                  <CheckCircle className="h-3 w-3" /> Verified
                </Badge>
              )}
              {profile.availability_status && (
                <Badge
                  variant={profile.availability_status === "available" ? "default" : "outline"}
                  className="w-fit text-xs"
                >
                  {profile.availability_status === "available" ? "Open to Work" : "Not Available"}
                </Badge>
              )}
            </div>

            {profile.job_title && (
              <p className="text-muted-foreground mt-1">{profile.job_title}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </span>
              )}
              {(profile.total_gigs_completed ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> {profile.total_gigs_completed} gigs completed
                </span>
              )}
              {(profile.average_rating ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  ⭐ {Number(profile.average_rating).toFixed(1)} ({profile.total_reviews} reviews)
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 sm:ml-auto sm:self-start sm:mt-20">
            {!isOwner && (
              <>
                <Button size="sm" onClick={onMessage} className="gap-1.5">
                  <MessageSquare className="h-4 w-4" /> Message
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Briefcase className="h-4 w-4" /> Hire
                </Button>
              </>
            )}
            {profile.cv_url && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> CV
                </a>
              </Button>
            )}
            {isOwner && (
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={onToggleVisibility}>
                {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {isPublic ? "Public" : "Private"}
              </Button>
            )}
          </div>
        </div>

        {/* Completion bar (owner only) */}
        {isOwner && completionPercent < 100 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Profile completion</span>
              <span>{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-1.5" />
          </div>
        )}

        {profile.bio && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {profile.bio}
          </p>
        )}
      </div>
    </div>
  );
};

// Skeleton loader
export const ProfileHeaderSkeleton = () => (
  <div className="bg-card border rounded-xl overflow-hidden">
    <Skeleton className="h-32 sm:h-48 w-full rounded-none" />
    <div className="px-4 sm:px-8 pb-6 -mt-16 sm:-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <Skeleton className="h-28 w-28 sm:h-32 sm:w-32 rounded-full" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
  </div>
);
