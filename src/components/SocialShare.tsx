import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, MessageCircle, Twitter, Facebook, Linkedin, Link, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareProps {
  title: string;
  url?: string;
  description?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const SocialShare = ({ 
  title, 
  url = typeof window !== 'undefined' ? window.location.href : '', 
  description = "Check out this amazing opportunity on SkillLink Africa!",
  variant = "outline",
  size = "sm"
}: SocialShareProps) => {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  // Use native share if available (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="cursor-pointer gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('twitter')} className="cursor-pointer gap-2">
          <Twitter className="w-4 h-4 text-primary" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer gap-2">
          <Facebook className="w-4 h-4 text-primary" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('linkedin')} className="cursor-pointer gap-2">
          <Linkedin className="w-4 h-4 text-primary" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer gap-2">
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Link className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </DropdownMenuItem>
        {typeof navigator !== 'undefined' && navigator.share && (
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer gap-2">
            <Share2 className="w-4 h-4" />
            More Options
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SocialShare;
