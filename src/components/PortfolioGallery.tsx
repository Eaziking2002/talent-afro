import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Award, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  user_id: string;
}

interface PortfolioGalleryProps {
  profileId: string;
  isOwner?: boolean;
}

export const PortfolioGallery = ({ profileId, isOwner }: PortfolioGalleryProps) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPortfolioItems();
  }, [profileId]);

  const fetchPortfolioItems = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('profile_id', profileId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setItems(data || []);
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

  const handleDelete = async (itemId: string, fileUrl: string) => {
    try {
      // Delete from storage
      const fileName = fileUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('portfolios').remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio item deleted",
      });

      fetchPortfolioItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading portfolio...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No portfolio items yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden group">
          <div className="aspect-video bg-muted relative">
            {item.file_type === 'image' ? (
              <img
                src={item.file_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {item.file_type === 'certificate' ? (
                  <Award className="w-16 h-16 text-muted-foreground" />
                ) : (
                  <FileText className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
            )}
            {isOwner && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item.id, item.file_url)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-1">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <a
              href={item.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              View Full Size
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
};