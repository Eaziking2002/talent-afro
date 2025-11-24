import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active connections
const connections = new Map<string, WebSocket>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let roomId: string | null = null;
  let userId: string | null = null;

  socket.onopen = () => {
    console.log("WebSocket connection opened");
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
        case 'join':
          roomId = message.roomId;
          userId = message.userId;
          connections.set(`${roomId}:${userId}`, socket);
          
          // Notify others in the room
          if (roomId && userId) {
            broadcastToRoom(roomId, userId, {
              type: 'user-joined',
              userId
            });
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Forward signaling messages to the intended recipient
          const recipientSocket = connections.get(`${message.roomId}:${message.to}`);
          if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
            recipientSocket.send(JSON.stringify({
              ...message,
              from: userId
            }));
          }
          break;

        case 'leave':
          if (roomId && userId) {
            handleLeave(roomId, userId);
          }
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    if (roomId && userId) {
      handleLeave(roomId, userId);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});

function broadcastToRoom(roomId: string, excludeUserId: string, message: any) {
  connections.forEach((socket, key) => {
    if (key.startsWith(`${roomId}:`) && !key.endsWith(excludeUserId)) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    }
  });
}

function handleLeave(roomId: string, userId: string) {
  connections.delete(`${roomId}:${userId}`);
  broadcastToRoom(roomId, userId, {
    type: 'user-left',
    userId
  });
}