import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = (userId: string | null) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Not Supported",
        description: "Browser notifications are not supported",
        variant: "destructive",
      });
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      toast({
        title: "Notifications Enabled",
        description: "You'll receive updates about contracts and milestones",
      });
    }
  };

  const showNotification = (title: string, body: string, icon?: string) => {
    if (permission !== "granted") return;

    const notification = new Notification(title, {
      body,
      icon: icon || "/placeholder.svg",
      badge: "/placeholder.svg",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };

  useEffect(() => {
    if (!userId || permission !== "granted") return;

    // Subscribe to contract messages
    const messagesChannel = supabase
      .channel("contract-messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contract_messages",
        },
        async (payload) => {
          const message = payload.new;
          if (message.sender_id !== userId) {
            const { data: sender } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", message.sender_id)
              .single();

            showNotification(
              "New Contract Message",
              `${sender?.full_name || "Someone"} sent: ${message.message_text.substring(0, 50)}...`
            );
          }
        }
      )
      .subscribe();

    // Subscribe to milestone updates
    const milestonesChannel = supabase
      .channel("milestones-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "milestones",
        },
        async (payload) => {
          const milestone = payload.new;
          const oldMilestone = payload.old;

          if (milestone.status !== oldMilestone.status) {
            const statusMessages: Record<string, string> = {
              approved: "Milestone approved! Payment released.",
              rejected: "Milestone was rejected. Please review feedback.",
              submitted: "Milestone submitted for review.",
              in_progress: "Milestone work has started.",
            };

            const message = statusMessages[milestone.status];
            if (message) {
              showNotification("Milestone Update", `${milestone.title}: ${message}`);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to dispute updates
    const disputesChannel = supabase
      .channel("disputes-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disputes",
        },
        async (payload) => {
          const dispute = payload.new as any;
          
          if (payload.eventType === "INSERT") {
            showNotification("Dispute Raised", "A dispute has been raised on one of your contracts.");
          } else if (payload.eventType === "UPDATE" && payload.old) {
            const oldDispute = payload.old as any;
            if (dispute.status === "resolved" && oldDispute.status !== "resolved") {
              showNotification("Dispute Resolved", "A dispute on your contract has been resolved.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(milestonesChannel);
      supabase.removeChannel(disputesChannel);
    };
  }, [userId, permission]);

  return { permission, requestPermission, showNotification };
};
