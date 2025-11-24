import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Clock, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ServiceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price_minor_units: number;
  currency: string;
  delivery_days: number;
  requirements: string;
  talent_id: string;
  profiles: {
    full_name: string;
    average_rating: number;
    total_reviews: number;
  };
}

export default function SkillsMarketplace() {
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<ServiceListing | null>(null);
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [requirements, setRequirements] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("service_listings")
        .select(`
          *,
          profiles!service_listings_talent_id_fkey (
            full_name,
            average_rating,
            total_reviews
          )
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error("Failed to load services: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedService) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to purchase");
        return;
      }

      const { error } = await supabase
        .from("service_purchases")
        .insert({
          service_id: selectedService.id,
          buyer_id: user.id,
          seller_id: selectedService.talent_id,
          amount_minor_units: selectedService.price_minor_units,
          currency: selectedService.currency,
          requirements_text: requirements,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Service purchased! The talent will contact you soon.");
      setPurchaseDialog(false);
      setRequirements("");
      setSelectedService(null);
    } catch (error: any) {
      toast.error("Failed to purchase service: " + error.message);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(services.map(s => s.category))];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Skills Marketplace</h1>
          <p className="text-muted-foreground">Browse and purchase professional services</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading services...</div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No services found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">{service.category}</Badge>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-bold">
                        {(service.price_minor_units / 100).toFixed(2)} {service.currency}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="line-clamp-2">{service.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{service.delivery_days} day delivery</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{service.profiles.full_name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span>{service.profiles.average_rating?.toFixed(1) || "New"}</span>
                        <span className="text-muted-foreground">
                          ({service.profiles.total_reviews || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setSelectedService(service);
                      setPurchaseDialog(true);
                    }}
                  >
                    Purchase Service
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Service</DialogTitle>
            <DialogDescription>
              {selectedService?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Your Requirements</Label>
              <Textarea
                placeholder="Describe what you need..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Service Price:</span>
                <span className="font-bold">
                  ${(selectedService?.price_minor_units || 0) / 100} {selectedService?.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Time:</span>
                <span>{selectedService?.delivery_days} days</span>
              </div>
            </div>

            <Button onClick={handlePurchase} className="w-full">
              Confirm Purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
