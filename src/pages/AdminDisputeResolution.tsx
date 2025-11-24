import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function AdminDisputeResolution() {
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: disputes } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          contracts (
            id,
            jobs (title),
            employer:profiles!contracts_employer_id_fkey(full_name),
            talent:profiles!contracts_talent_id_fkey(full_name)
          ),
          dispute_escalations (
            id,
            escalated_at,
            escalation_notes
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const resolveDispute = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      const { error: disputeError } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (disputeError) throw disputeError;

      await supabase
        .from("dispute_escalations")
        .update({ resolved_at: new Date().toISOString() })
        .eq("dispute_id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      toast({ title: "Dispute resolved successfully" });
      setSelectedDispute(null);
      setResolution("");
    },
  });

  const openCount = disputes?.filter(d => d.status === "open").length || 0;
  const escalatedCount = disputes?.filter(d => d.dispute_escalations?.length > 0).length || 0;
  const resolvedCount = disputes?.filter(d => d.status === "resolved").length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <h1 className="text-4xl font-bold text-center">Dispute Resolution</h1>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escalated</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{escalatedCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resolvedCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {disputes?.map((dispute: any) => (
                  <div key={dispute.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{dispute.status}</Badge>
                      {dispute.dispute_escalations?.length > 0 && (
                        <Badge variant="destructive">Escalated</Badge>
                      )}
                    </div>

                    <p className="font-medium">{dispute.contracts.jobs.title}</p>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-sm">{dispute.reason}</p>
                    </div>

                    {dispute.status === "open" && selectedDispute === dispute.id ? (
                      <div className="space-y-2">
                        <Label>Resolution</Label>
                        <Textarea
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          rows={3}
                        />
                        <Button
                          onClick={() => resolveDispute.mutate({ id: dispute.id, resolution })}
                          disabled={!resolution}
                        >
                          Confirm Resolution
                        </Button>
                      </div>
                    ) : dispute.status === "open" ? (
                      <Button onClick={() => setSelectedDispute(dispute.id)}>
                        Resolve
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
