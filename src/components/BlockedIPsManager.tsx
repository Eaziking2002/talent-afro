import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ban, Shield, Trash2, Plus, RefreshCw, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string | null;
  blocked_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  abuse_count: number;
  last_abuse_at: string;
}

export default function BlockedIPsManager() {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newIP, setNewIP] = useState("");
  const [newReason, setNewReason] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresHours, setExpiresHours] = useState(24);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchBlockedIPs();
  }, []);

  async function fetchBlockedIPs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("blocked_ips")
      .select("*")
      .order("blocked_at", { ascending: false });

    if (error) {
      console.error("Error fetching blocked IPs:", error);
      toast.error("Failed to fetch blocked IPs");
    } else {
      setBlockedIPs(data || []);
    }
    setLoading(false);
  }

  async function blockIP() {
    if (!newIP.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([a-fA-F0-9:]+)$/;
    if (!ipRegex.test(newIP.trim())) {
      toast.error("Please enter a valid IP address");
      return;
    }

    const expiresAt = isPermanent 
      ? null 
      : new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("blocked_ips")
      .insert({
        ip_address: newIP.trim(),
        reason: newReason.trim() || "Manually blocked by admin",
        is_permanent: isPermanent,
        expires_at: expiresAt,
      });

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("This IP is already blocked");
      } else {
        toast.error("Failed to block IP");
      }
    } else {
      toast.success(`IP ${newIP} blocked successfully`);
      setNewIP("");
      setNewReason("");
      setIsPermanent(false);
      setExpiresHours(24);
      setAddDialogOpen(false);
      fetchBlockedIPs();
    }
  }

  async function unblockIP(id: string, ipAddress: string) {
    const { error } = await supabase
      .from("blocked_ips")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to unblock IP");
    } else {
      toast.success(`IP ${ipAddress} unblocked`);
      fetchBlockedIPs();
    }
  }

  async function togglePermanent(id: string, currentPermanent: boolean) {
    const updates: { is_permanent: boolean; expires_at?: string | null } = {
      is_permanent: !currentPermanent,
    };
    
    if (!currentPermanent) {
      // Making permanent, remove expiry
      updates.expires_at = null;
    } else {
      // Making temporary, set 24h expiry
      updates.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from("blocked_ips")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update block");
    } else {
      toast.success("Block updated");
      fetchBlockedIPs();
    }
  }

  const filteredIPs = blockedIPs.filter(ip =>
    ip.ip_address.includes(searchTerm) ||
    ip.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeBlocks = blockedIPs.filter(ip => 
    ip.is_permanent || !ip.expires_at || new Date(ip.expires_at) > new Date()
  ).length;

  const expiredBlocks = blockedIPs.length - activeBlocks;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              IP Blocking Management
            </CardTitle>
            <CardDescription>
              Block malicious IPs and manage abuse prevention
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchBlockedIPs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Block IP
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block IP Address</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>IP Address</Label>
                    <Input
                      placeholder="e.g., 192.168.1.1"
                      value={newIP}
                      onChange={(e) => setNewIP(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea
                      placeholder="Reason for blocking..."
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="permanent"
                      checked={isPermanent}
                      onCheckedChange={setIsPermanent}
                    />
                    <Label htmlFor="permanent">Permanent block</Label>
                  </div>
                  {!isPermanent && (
                    <div className="space-y-2">
                      <Label>Block duration (hours)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="8760"
                        value={expiresHours}
                        onChange={(e) => setExpiresHours(parseInt(e.target.value) || 24)}
                      />
                    </div>
                  )}
                  <Button onClick={blockIP} className="w-full">
                    <Ban className="h-4 w-4 mr-2" />
                    Block IP Address
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{blockedIPs.length}</div>
            <div className="text-sm text-muted-foreground">Total Blocks</div>
          </div>
          <div className="text-center p-4 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{activeBlocks}</div>
            <div className="text-sm text-muted-foreground">Active Blocks</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-muted-foreground">{expiredBlocks}</div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by IP or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        {/* IP List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredIPs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No blocked IPs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIPs.map((ip) => {
              const isExpired = ip.expires_at && new Date(ip.expires_at) < new Date();
              const isActive = ip.is_permanent || !isExpired;

              return (
                <div
                  key={ip.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    isActive ? "border-destructive/50 bg-destructive/5" : "opacity-60"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold">{ip.ip_address}</code>
                      {ip.is_permanent ? (
                        <Badge variant="destructive">Permanent</Badge>
                      ) : isExpired ? (
                        <Badge variant="outline">Expired</Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Temporary
                        </Badge>
                      )}
                      {ip.abuse_count > 5 && (
                        <Badge variant="destructive" className="bg-orange-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High abuse ({ip.abuse_count})
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {ip.reason || "No reason provided"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                      <span>Blocked: {format(new Date(ip.blocked_at), "PPp")}</span>
                      {ip.expires_at && !ip.is_permanent && (
                        <span>
                          {isExpired ? "Expired" : "Expires"}: {format(new Date(ip.expires_at), "PPp")}
                        </span>
                      )}
                      <span>Abuse attempts: {ip.abuse_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={ip.is_permanent}
                        onCheckedChange={() => togglePermanent(ip.id, ip.is_permanent)}
                      />
                      <Label className="text-xs">Permanent</Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unblockIP(ip.id, ip.ip_address)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Unblock
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
