import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Smile, Paperclip, MoreVertical } from "lucide-react";
import { format } from "date-fns";

interface RealtimeChatProps {
  roomId: string;
  currentUserId: string;
}

export function RealtimeChat({ roomId, currentUserId }: RealtimeChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [typing, setTyping] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
    subscribeToTyping();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          profiles!chat_messages_sender_id_fkey (full_name, id)
        `)
        .eq("room_id", roomId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast.error("Failed to load messages: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const { data } = await supabase
            .from("chat_messages")
            .select(`
              *,
              profiles!chat_messages_sender_id_fkey (full_name, id)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToTyping = () => {
    const channel = supabase
      .channel(`typing-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `room_id=eq.${roomId}`
        },
        async () => {
          const { data } = await supabase
            .from("typing_indicators")
            .select(`
              user_id,
              profiles!typing_indicators_user_id_fkey (full_name)
            `)
            .eq("room_id", roomId)
            .neq("user_id", currentUserId);

          if (data) {
            setTyping(data.map((d: any) => d.profiles.full_name));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTyping = async () => {
    // Update typing indicator
    await supabase
      .from("typing_indicators")
      .upsert({
        room_id: roomId,
        user_id: currentUserId,
        started_at: new Date().toISOString()
      });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Remove typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", currentUserId);
    }, 3000);
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: roomId,
          sender_id: currentUserId,
          message_text: messageText,
          message_type: "text"
        });

      if (error) throw error;

      setMessageText("");

      // Clear typing indicator
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", currentUserId);
    } catch (error: any) {
      toast.error("Failed to send message: " + error.message);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = message.reactions || {};
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      const userIndex = reactions[emoji].indexOf(currentUserId);
      if (userIndex > -1) {
        reactions[emoji].splice(userIndex, 1);
      } else {
        reactions[emoji].push(currentUserId);
      }

      const { error } = await supabase
        .from("chat_messages")
        .update({ reactions })
        .eq("id", messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, reactions } : m)
      );
    } catch (error: any) {
      toast.error("Failed to add reaction: " + error.message);
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <div className="text-center py-8">Loading chat...</div>;
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar>
                    <AvatarFallback>
                      {message.profiles?.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${isOwn ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.profiles?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), "HH:mm")}
                      </span>
                    </div>
                    <div
                      className={`inline-block rounded-lg px-4 py-2 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.message_text}</p>
                    </div>
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {Object.entries(message.reactions).map(([emoji, users]: [string, any]) => (
                          users.length > 0 && (
                            <Badge
                              key={emoji}
                              variant="secondary"
                              className="cursor-pointer hover:bg-secondary/80"
                              onClick={() => handleReaction(message.id, emoji)}
                            >
                              {emoji} {users.length}
                            </Badge>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleReaction(message.id, "👍")}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {typing.length > 0 && (
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                <span>{typing.join(", ")} {typing.length === 1 ? "is" : "are"} typing...</span>
                <span className="animate-pulse">●●●</span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
