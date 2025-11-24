import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { RealtimeChat } from "@/components/RealtimeChat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ChatRoom() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initChat();
  }, [searchParams]);

  const initChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to access chat");
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const contractId = searchParams.get("contract");
      const applicationId = searchParams.get("application");
      const existingRoomId = searchParams.get("room");

      if (existingRoomId) {
        setRoomId(existingRoomId);
        await fetchRoomInfo(existingRoomId);
      } else if (contractId || applicationId) {
        // Create or find existing room
        const { data: existingRoom } = await supabase
          .from("chat_rooms")
          .select("id")
          .or(`contract_id.eq.${contractId},application_id.eq.${applicationId}`)
          .single();

        if (existingRoom) {
          setRoomId(existingRoom.id);
          await fetchRoomInfo(existingRoom.id);
        } else {
          // Create new room
          const { data: newRoom, error } = await supabase
            .from("chat_rooms")
            .insert({
              contract_id: contractId || null,
              application_id: applicationId || null,
              participant_ids: [user.id], // Will be updated with other participant
              room_type: contractId ? "contract" : "direct"
            })
            .select()
            .single();

          if (error) throw error;
          setRoomId(newRoom.id);
          await fetchRoomInfo(newRoom.id);
        }
      }
    } catch (error: any) {
      toast.error("Failed to initialize chat: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomInfo = async (id: string) => {
    const { data } = await supabase
      .from("chat_rooms")
      .select(`
        *,
        contracts (
          id,
          jobs (title)
        ),
        applications (
          id,
          jobs (title)
        )
      `)
      .eq("id", id)
      .single();

    if (data) setRoomInfo(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          Loading chat...
        </div>
      </div>
    );
  }

  if (!roomId || !userId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Invalid chat room</p>
              <Button onClick={() => navigate("/messages")} className="mt-4">
                Back to Messages
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/messages")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Messages
        </Button>

        <div className="mb-4">
          <h1 className="text-2xl font-bold">
            {roomInfo?.contracts?.[0]?.jobs?.title || 
             roomInfo?.applications?.[0]?.jobs?.title || 
             "Direct Message"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roomInfo?.room_type === "contract" ? "Contract Chat" : "Application Chat"}
          </p>
        </div>

        <RealtimeChat roomId={roomId} currentUserId={userId} />
      </div>
    </div>
  );
}
