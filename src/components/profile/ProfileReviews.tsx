import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_name?: string;
}

export const ProfileReviews = ({ revieweeId }: { revieweeId: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, review_text, created_at, reviewer_id")
        .eq("reviewee_id", revieweeId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        // Get reviewer names
        const reviewerIds = [...new Set(data.map((r) => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", reviewerIds);

        const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

        setReviews(
          data.map((r) => ({
            id: r.id,
            rating: r.rating,
            review_text: r.review_text,
            created_at: r.created_at,
            reviewer_name: nameMap.get(r.reviewer_id) || "Anonymous",
          }))
        );
      }
      setLoading(false);
    };
    fetch();
  }, [revieweeId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading reviews…</p>;
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>;

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="border rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-primary text-primary" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
          <p className="text-xs text-muted-foreground">— {r.reviewer_name}</p>
        </div>
      ))}
    </div>
  );
};
