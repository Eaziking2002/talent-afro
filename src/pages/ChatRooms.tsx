import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function ChatRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("chat_rooms")
        .select(`
          id,
          room_type,
          participant_ids,
          created_at,
          contracts (
            id,
            jobs (title),
            status
          ),
          applications (
            id,
            jobs (title),
            status
          )
        `)
        .contains("participant_ids", [user.id])
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get last message for each room
      const roomsWithMessages = await Promise.all(
        (data || []).map(async (room) => {
          const { data: lastMessage } = await supabase
            .from("chat_messages")
            .select("message_text, created_at, sender_id")
            .eq("room_id", room.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id)
            .neq("sender_id", user.id);

          return {
            ...room,
            lastMessage: lastMessage?.message_text,
            lastMessageTime: lastMessage?.created_at,
            unreadCount: count || 0
          };
        })
      );

      setRooms(roomsWithMessages);
    } catch (error: any) {
      toast.error("Failed to load chat rooms: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoomTitle = (room: any) => {
    if (room.contracts?.length > 0) {
      return room.contracts[0].jobs?.title || "Contract Chat";
    }
    if (room.applications?.length > 0) {
      return room.applications[0].jobs?.title || "Application Chat";
    }
    return "Direct Message";
  };

  const getRoomStatus = (room: any) => {
    if (room.contracts?.length > 0) {
      return room.contracts[0].status;
    }
    if (room.applications?.length > 0) {
      return room.applications[0].status;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">
            All your conversations in one place
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No conversations yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-full bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{getRoomTitle(room)}</h3>
                        {getRoomStatus(room) && (
                          <Badge variant="outline" className="capitalize">
                            {getRoomStatus(room)}
                          </Badge>
                        )}
                        {room.unreadCount > 0 && (
                          <Badge variant="default">{room.unreadCount} new</Badge>
                        )}
                      </div>
                      {room.lastMessage && (
                        <>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {room.lastMessage}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(room.lastMessageTime), "PPp")}
                          </p>
                        </>
                      )}
                      <Badge variant="secondary" className="mt-2 capitalize">
                        {room.room_type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(`/chat?room=${room.id}`)}
                    variant="ghost"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
