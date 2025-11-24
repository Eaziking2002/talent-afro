import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, DollarSign, FileText, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContractNegotiationProps {
  jobId: string;
  employerId: string;
  talentId: string;
  isEmployer: boolean;
}

export function ContractNegotiation({ jobId, employerId, talentId, isEmployer }: ContractNegotiationProps) {
  const [message, setMessage] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterTerms, setCounterTerms] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: negotiation } = useQuery({
    queryKey: ["negotiation", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_negotiations")
        .select(`
          *,
          employer:profiles!contract_negotiations_employer_id_fkey(full_name),
          talent:profiles!contract_negotiations_talent_id_fkey(full_name)
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["negotiation-messages", negotiation?.id],
    queryFn: async () => {
      if (!negotiation?.id) return [];
      
      const { data, error } = await supabase
        .from("negotiation_messages")
        .select(`
          *,
          sender:profiles!negotiation_messages_sender_id_fkey(full_name)
        `)
        .eq("negotiation_id", negotiation.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!negotiation?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!negotiation?.id) return;

    const channel = supabase
      .channel(`negotiation-${negotiation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "negotiation_messages",
          filter: `negotiation_id=eq.${negotiation.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["negotiation-messages"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contract_negotiations",
          filter: `id=eq.${negotiation.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["negotiation"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [negotiation?.id, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createNegotiation = useMutation({
    mutationFn: async ({ amount, terms }: { amount: number; terms: string }) => {
      const { data, error } = await supabase
        .from("contract_negotiations")
        .insert({
          job_id: jobId,
          employer_id: employerId,
          talent_id: talentId,
          proposed_amount_minor_units: amount * 100,
          proposed_terms: terms,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation"] });
      toast({ title: "Negotiation started" });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      if (!negotiation?.id) throw new Error("No active negotiation");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("negotiation_messages")
        .insert({
          negotiation_id: negotiation.id,
          sender_id: user.id,
          message_text: text,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["negotiation-messages"] });
    },
  });

  const submitCounterOffer = useMutation({
    mutationFn: async () => {
      if (!negotiation?.id) throw new Error("No active negotiation");

      const { data, error } = await supabase
        .from("contract_negotiations")
        .update({
          status: "countered",
          counter_offer_amount_minor_units: parseFloat(counterAmount) * 100,
          counter_offer_terms: counterTerms,
        })
        .eq("id", negotiation.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation"] });
      toast({ title: "Counter offer submitted" });
      setCounterAmount("");
      setCounterTerms("");
    },
  });

  const acceptOffer = useMutation({
    mutationFn: async () => {
      if (!negotiation?.id) throw new Error("No active negotiation");

      const { data, error } = await supabase
        .from("contract_negotiations")
        .update({ status: "accepted" })
        .eq("id", negotiation.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation"] });
      toast({ title: "Offer accepted! You can now create the contract." });
    },
  });

  if (!negotiation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Contract Negotiation</CardTitle>
          <CardDescription>Propose initial terms for this job</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Proposed Amount ($)</Label>
            <Input
              type="number"
              placeholder="1000.00"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea
              placeholder="Describe the work scope, timeline, deliverables..."
              value={counterTerms}
              onChange={(e) => setCounterTerms(e.target.value)}
              rows={5}
            />
          </div>

          <Button
            onClick={() => createNegotiation.mutate({ amount: parseFloat(counterAmount), terms: counterTerms })}
            disabled={!counterAmount || !counterTerms || createNegotiation.isPending}
          >
            Start Negotiation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Negotiation Details */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Negotiation Details</CardTitle>
          <Badge>{negotiation.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Proposed by Employer</p>
            <p className="text-2xl font-bold">
              ${(negotiation.proposed_amount_minor_units / 100).toFixed(2)}
            </p>
            <p className="text-sm mt-2">{negotiation.proposed_terms}</p>
          </div>

          {negotiation.counter_offer_amount_minor_units && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Counter Offer</p>
              <p className="text-2xl font-bold text-primary">
                ${(negotiation.counter_offer_amount_minor_units / 100).toFixed(2)}
              </p>
              <p className="text-sm mt-2">{negotiation.counter_offer_terms}</p>
            </div>
          )}

          {negotiation.status === "pending" && !isEmployer && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold">Submit Counter Offer</h4>
              <Input
                type="number"
                placeholder="Counter amount"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
              />
              <Textarea
                placeholder="Counter terms..."
                value={counterTerms}
                onChange={(e) => setCounterTerms(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => submitCounterOffer.mutate()}
                disabled={!counterAmount || submitCounterOffer.isPending}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Submit Counter Offer
              </Button>
            </div>
          )}

          {negotiation.status === "countered" && isEmployer && (
            <Button onClick={() => acceptOffer.mutate()} className="w-full">
              Accept Counter Offer
            </Button>
          )}

          {negotiation.status === "pending" && isEmployer && (
            <Button onClick={() => acceptOffer.mutate()} className="w-full">
              Accept Proposal
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Live Chat */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Live Negotiation Chat</CardTitle>
          <CardDescription>Discuss terms in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 pr-4 mb-4">
            <div className="space-y-4">
              {messages?.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === (isEmployer ? employerId : talentId) ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] p-3 rounded-lg ${
                    msg.sender_id === (isEmployer ? employerId : talentId)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    <p className="text-sm font-medium mb-1">{msg.sender?.full_name}</p>
                    <p className="text-sm">{msg.message_text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && message && sendMessage.mutate(message)}
            />
            <Button
              onClick={() => message && sendMessage.mutate(message)}
              disabled={!message || sendMessage.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
