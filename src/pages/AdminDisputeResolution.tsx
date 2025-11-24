import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  raised_by: string;
  contracts: {
    id: string;
    total_amount_minor_units: number;
    currency: string;
    jobs: { title: string };
  };
}

const AdminDisputeResolution = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roles) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      fetchDisputes();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    }
  };

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          contracts (
            id,
            total_amount_minor_units,
            currency,
            jobs (title)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
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

  const handleResolveDispute = async (disputeId: string, newStatus: string) => {
    if (newStatus === "resolved" && !resolution.trim()) {
      toast({
        title: "Resolution Required",
        description: "Please provide a resolution before resolving the dispute",
        variant: "destructive",
      });
      return;
    }

    try {
      setResolving(true);
      const { error } = await supabase
        .from("disputes")
        .update({
          status: newStatus,
          resolution: resolution || null,
          resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
        })
        .eq("id", disputeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Dispute ${newStatus}`,
      });

      setSelectedDispute(null);
      setResolution("");
      fetchDisputes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      open: { icon: AlertCircle, color: "bg-red-500", label: "Open" },
      in_review: { icon: Clock, color: "bg-yellow-500", label: "In Review" },
      resolved: { icon: CheckCircle, color: "bg-green-500", label: "Resolved" },
      closed: { icon: XCircle, color: "bg-gray-500", label: "Closed" },
    };

    const { icon: Icon, color, label } = config[status as keyof typeof config] || config.open;

    return (
      <Badge className={`${color} gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading disputes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dispute Resolution</h1>
          <p className="text-lg text-muted-foreground">
            Review and mediate contract disputes
          </p>
        </div>

        <div className="grid gap-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Disputes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{disputes.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {disputes.filter((d) => d.status === "open").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {disputes.filter((d) => d.status === "in_review").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Resolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {disputes.filter((d) => d.status === "resolved").length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          {disputes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No disputes to review</p>
              </CardContent>
            </Card>
          ) : (
            disputes.map((dispute) => (
              <Card key={dispute.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {dispute.contracts.jobs.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Contract Value: {(dispute.contracts.total_amount_minor_units / 100).toFixed(2)}{" "}
                        {dispute.contracts.currency}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(dispute.status)}
                      <p className="text-xs text-muted-foreground">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Reason:</p>
                    <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                  </div>
                  {dispute.resolution && (
                    <div>
                      <p className="text-sm font-medium mb-1">Resolution:</p>
                      <p className="text-sm text-muted-foreground">{dispute.resolution}</p>
                    </div>
                  )}
                  {dispute.status !== "resolved" && dispute.status !== "closed" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setResolution("");
                        }}
                      >
                        Review Dispute
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Dispute Reason:</p>
              <p className="text-sm text-muted-foreground">{selectedDispute?.reason}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Resolution</label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how this dispute was resolved..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedDispute && handleResolveDispute(selectedDispute.id, "in_review")
              }
              disabled={resolving}
            >
              Mark In Review
            </Button>
            <Button
              onClick={() =>
                selectedDispute && handleResolveDispute(selectedDispute.id, "resolved")
              }
              disabled={resolving || !resolution.trim()}
            >
              {resolving ? "Resolving..." : "Resolve Dispute"}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedDispute && handleResolveDispute(selectedDispute.id, "closed")
              }
              disabled={resolving}
            >
              Close Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputeResolution;