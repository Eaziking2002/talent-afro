import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

interface ContractChatProps {
  contractId: string;
  currentUserId: string;
}

export const ContractChat = ({ contractId, currentUserId }: ContractChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, [contractId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_messages")
        .select(`
          *,
          sender:sender_id (
            full_name
          )
        `)
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map((msg: any) => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
      }));

      setMessages(transformedData);
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

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`contract-messages-${contractId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contract_messages",
          filter: `contract_id=eq.${contractId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from("contract_messages")
            .select(`
              *,
              sender:sender_id (
                full_name
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const transformedMessage = {
              ...data,
              sender: Array.isArray(data.sender) ? data.sender[0] : data.sender,
            };
            setMessages((prev) => [...prev, transformedMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase.from("contract_messages").insert({
        contract_id: contractId,
        sender_id: currentUserId,
        message_text: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return <div className="text-center py-4">Loading messages...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Contract Discussion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {message.sender?.full_name
                          ? getInitials(message.sender.full_name)
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwnMessage ? "text-right" : "text-left"}`}>
                      <div
                        className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {message.sender?.full_name || "Unknown User"}
                        </p>
                        <p className="text-sm">{message.message_text}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-2">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        <form onSubmit={sendMessage} className="flex gap-2 mt-4">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};