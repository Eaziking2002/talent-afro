import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, MessageSquare, FileText, DollarSign, AlertTriangle, Users, Handshake } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export default function NotificationCenter() {
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "contract_update":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "payment":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case "milestone":
        return <FileText className="h-5 w-5 text-orange-500" />;
      case "dispute":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "application":
        return <Users className="h-5 w-5 text-indigo-500" />;
      case "negotiation":
        return <Handshake className="h-5 w-5 text-teal-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const filteredNotifications = notifications?.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.is_read;
    return n.type === filter;
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => markAllAsRead.mutate()} disabled={unreadCount === 0}>
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="message">Messages</TabsTrigger>
              <TabsTrigger value="contract_update">Contracts</TabsTrigger>
              <TabsTrigger value="payment">Payments</TabsTrigger>
              <TabsTrigger value="milestone">Milestones</TabsTrigger>
              <TabsTrigger value="dispute">Disputes</TabsTrigger>
              <TabsTrigger value="application">Applications</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredNotifications?.length === 0 && (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        No notifications to display
                      </CardContent>
                    </Card>
                  )}

                  {filteredNotifications?.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-colors ${
                        !notification.is_read ? "bg-accent/50" : ""
                      }`}
                      onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">{getIcon(notification.type)}</div>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold">{notification.title}</h3>
                                {notification.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.description}
                                  </p>
                                )}
                              </div>
                              {!notification.is_read && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {notification.type.replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
