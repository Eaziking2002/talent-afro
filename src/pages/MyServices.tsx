import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price_minor_units: number;
  currency: string;
  delivery_days: number;
  requirements: string;
  active: boolean;
}

export default function MyServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    delivery_days: "",
    requirements: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profileId) {
      fetchServices();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfileId(data.id);
    } catch (error: any) {
      toast.error("Failed to load profile: " + error.message);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("service_listings")
        .select("*")
        .eq("talent_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error("Failed to load services: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profileId) return;

    try {
      const serviceData = {
        talent_id: profileId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price_minor_units: Math.round(parseFloat(formData.price) * 100),
        currency: "USD",
        delivery_days: parseInt(formData.delivery_days),
        requirements: formData.requirements,
        active: true
      };

      if (editingService) {
        const { error } = await supabase
          .from("service_listings")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Service updated successfully!");
      } else {
        const { error } = await supabase
          .from("service_listings")
          .insert(serviceData);

        if (error) throw error;
        toast.success("Service created successfully!");
      }

      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error("Failed to save service: " + error.message);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      category: service.category,
      price: (service.price_minor_units / 100).toString(),
      delivery_days: service.delivery_days.toString(),
      requirements: service.requirements || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase
        .from("service_listings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Service deleted successfully!");
      fetchServices();
    } catch (error: any) {
      toast.error("Failed to delete service: " + error.message);
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from("service_listings")
        .update({ active: !service.active })
        .eq("id", service.id);

      if (error) throw error;
      toast.success(`Service ${service.active ? "deactivated" : "activated"}!`);
      fetchServices();
    } catch (error: any) {
      toast.error("Failed to update service: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      price: "",
      delivery_days: "",
      requirements: ""
    });
    setEditingService(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Services</h1>
            <p className="text-muted-foreground">Manage your service offerings</p>
          </div>
          
          <Button onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading services...</div>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't created any services yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={service.active ? "default" : "secondary"}>
                      {service.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{service.category}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2">{service.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-bold">
                        ${(service.price_minor_units / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery:</span>
                      <span>{service.delivery_days} days</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(service)}
                  >
                    {service.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Create New Service"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for your service offering
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Service Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Logo Design"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your service..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Design"
                />
              </div>

              <div>
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="50.00"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <Label>Delivery Time (Days)</Label>
              <Input
                type="number"
                value={formData.delivery_days}
                onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                placeholder="3"
              />
            </div>

            <div>
              <Label>Requirements (Optional)</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="What information do you need from buyers?"
                rows={3}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              {editingService ? "Update Service" : "Create Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
