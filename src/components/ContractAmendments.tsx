import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileEdit, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ContractAmendmentsProps {
  contractId: string;
  userId: string;
  isEmployer: boolean;
}

export function ContractAmendments({ contractId, userId, isEmployer }: ContractAmendmentsProps) {
  const [open, setOpen] = useState(false);
  const [amendmentType, setAmendmentType] = useState("terms");
  const [amendmentData, setAmendmentData] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: amendments } = useQuery({
    queryKey: ["amendments", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_amendments")
        .select(`
          *,
          proposer:profiles!contract_amendments_proposed_by_fkey(full_name),
          approver:profiles!contract_amendments_approved_by_fkey(full_name)
        `)
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const proposeAmendment = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("contract_amendments")
        .insert({
          contract_id: contractId,
          proposed_by: userId,
          amendment_type: amendmentType,
          amendment_data: { description: amendmentData },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amendments"] });
      toast({ title: "Amendment proposed successfully" });
      setOpen(false);
      setAmendmentData("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAmendment = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { data, error } = await supabase
        .from("contract_amendments")
        .update({
          status: approved ? "approved" : "rejected",
          approved_by: userId,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["amendments"] });
      toast({
        title: variables.approved ? "Amendment approved" : "Amendment rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contract Amendments</CardTitle>
            <CardDescription>Propose or review changes to the contract</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileEdit className="h-4 w-4 mr-2" />
                Propose Amendment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Propose Contract Amendment</DialogTitle>
                <DialogDescription>
                  Submit a proposed change to the contract for approval
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Amendment Type</Label>
                  <Select value={amendmentType} onValueChange={setAmendmentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terms">Contract Terms</SelectItem>
                      <SelectItem value="milestone">Add/Remove Milestone</SelectItem>
                      <SelectItem value="budget">Budget Adjustment</SelectItem>
                      <SelectItem value="duration">Duration Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data">Amendment Details</Label>
                  <Textarea
                    id="data"
                    placeholder="Describe the proposed changes..."
                    value={amendmentData}
                    onChange={(e) => setAmendmentData(e.target.value)}
                    rows={5}
                  />
                </div>

                <Button
                  onClick={() => proposeAmendment.mutate()}
                  disabled={proposeAmendment.isPending || !amendmentData}
                  className="w-full"
                >
                  {proposeAmendment.isPending ? "Submitting..." : "Submit Amendment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {amendments?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No amendments proposed yet
            </p>
          )}

          {amendments?.map((amendment: any) => (
            <div key={amendment.id} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {amendment.amendment_type.replace("_", " ")}
                  </Badge>
                  {getStatusIcon(amendment.status)}
                  <Badge variant={
                    amendment.status === "approved" ? "default" :
                    amendment.status === "rejected" ? "destructive" :
                    "secondary"
                  }>
                    {amendment.status}
                  </Badge>
                </div>
                {amendment.status === "pending" && amendment.proposed_by !== userId && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAmendment.mutate({ id: amendment.id, approved: true })}
                      disabled={handleAmendment.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAmendment.mutate({ id: amendment.id, approved: false })}
                      disabled={handleAmendment.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-sm">
                {(amendment.amendment_data as any)?.description || "No description"}
              </p>

              <p className="text-xs text-muted-foreground">
                Proposed by {amendment.proposer?.full_name} on{" "}
                {new Date(amendment.created_at).toLocaleDateString()}
                {amendment.approved_by && ` • Reviewed by ${amendment.approver?.full_name}`}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
