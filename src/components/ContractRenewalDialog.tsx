import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ContractRenewalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalContract: {
    id: string;
    job_id: string;
    talent_id: string;
    employer_id: string;
    total_amount_minor_units: number;
    currency: string;
    terms: string | null;
    jobs: { title: string };
  };
  talentName: string;
}

export const ContractRenewalDialog = ({
  isOpen,
  onClose,
  originalContract,
  talentName,
}: ContractRenewalDialogProps) => {
  const [amount, setAmount] = useState((originalContract.total_amount_minor_units / 100).toString());
  const [durationDays, setDurationDays] = useState("30");
  const [terms, setTerms] = useState(originalContract.terms || "");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleRenew = async () => {
    try {
      setCreating(true);

      const amountMinorUnits = Math.round(parseFloat(amount) * 100);
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + parseInt(durationDays) * 24 * 60 * 60 * 1000).toISOString();

      // Get an application for this job/talent combination
      const { data: application } = await supabase
        .from("applications")
        .select("id")
        .eq("job_id", originalContract.job_id)
        .eq("applicant_id", originalContract.talent_id)
        .single();

      if (!application) throw new Error("No application found");

      // Create renewed contract
      const { data: newContract, error: contractError } = await supabase
        .from("contracts")
        .insert({
          application_id: application.id,
          job_id: originalContract.job_id,
          talent_id: originalContract.talent_id,
          employer_id: originalContract.employer_id,
          total_amount_minor_units: amountMinorUnits,
          currency: originalContract.currency,
          terms,
          status: "draft",
          start_date: startDate,
          end_date: endDate,
          parent_contract_id: originalContract.id,
          is_renewal: true,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      toast({
        title: "Success",
        description: "Contract renewal created! Please review and activate it.",
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Renew Contract
          </DialogTitle>
          <DialogDescription>
            Create a new contract with {talentName} for {originalContract.jobs.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Contract Amount ({originalContract.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Days)</Label>
              <Input
                id="duration"
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Contract Terms</Label>
            <Textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Describe the scope, deliverables, and expectations..."
              rows={6}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Previous Contract Summary</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Amount: {(originalContract.total_amount_minor_units / 100).toFixed(2)} {originalContract.currency}</p>
              <p>Status: Successfully Completed</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleRenew} disabled={creating || !amount || !durationDays}>
            {creating ? "Creating..." : "Create Renewal Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
