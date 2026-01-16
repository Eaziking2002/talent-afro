import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Clock, FileText, MessageSquare, Bell, BellOff, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ContractChat } from "./ContractChat";
import { RatingPrompt } from "./RatingPrompt";
import { InvoiceGenerator } from "./InvoiceGenerator";
import { ContractRenewalDialog } from "./ContractRenewalDialog";
import { ContractAmendments } from "./ContractAmendments";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Contract {
  id: string;
  status: string;
  total_amount_minor_units: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  employer_id: string;
  talent_id: string;
  jobs: { title: string };
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  amount_minor_units: number;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  contract_id: string;
}

export const ContractManager = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [raisingDispute, setRaisingDispute] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [ratingData, setRatingData] = useState<{
    revieweeId: string;
    revieweeName: string;
  } | null>(null);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewalContract, setRenewalContract] = useState<any>(null);
  const { toast } = useToast();
  const { permission, requestPermission } = useNotifications(userId);

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    if (selectedContract) {
      fetchMilestones(selectedContract);
    }
  }, [selectedContract]);

  const fetchContracts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from('contracts')
        .select('*, jobs(title)')
        .or(`employer_id.eq.${user.id},talent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
      if (data && data.length > 0) {
        setSelectedContract(data[0].id);
      }
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

  const fetchMilestones = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateMilestoneStatus = async (milestoneId: string, newStatus: string) => {
    try {
      const milestone = milestones.find((m) => m.id === milestoneId);
      if (!milestone) throw new Error("Milestone not found");

      const { error } = await supabase
        .from('milestones')
        .update({ status: newStatus })
        .eq('id', milestoneId);

      if (error) throw error;

      // Send email notification and show rating prompt if milestone approved
      if (newStatus === "approved" && selectedContractData) {
        const contract = contracts.find((c) => c.id === selectedContract);
        const isEmployer = contract && userId === contract.employer_id;
        const otherPartyId = isEmployer ? contract.talent_id : contract.employer_id;

        // Get profile name (public data)
        const { data: otherPartyProfile } = await supabase
          .from("profiles")
          .select("full_name, user_id")
          .eq("id", otherPartyId)
          .single();
        
        // Get contact info via secure RPC (only works for contract parties/admin)
        // Using type assertion since the function was just created
        const { data: contactInfo } = otherPartyProfile?.user_id 
          ? await supabase.rpc("get_contact_info" as any, { target_user_id: otherPartyProfile.user_id })
          : { data: null };
        
        const otherPartyEmail = contactInfo?.[0]?.email;

        if (otherPartyEmail) {
          await supabase.functions.invoke("send-transaction-email", {
            body: {
              to: otherPartyEmail,
              userName: otherPartyProfile.full_name,
              transactionType: "payment_released",
              amount: milestone.amount_minor_units / 100,
              currency: selectedContractData.currency,
              jobTitle: selectedContractData.jobs?.title,
              transactionId: milestoneId,
            },
          });
        }

        // Check if user has already reviewed
        if (contract) {
          const { data: existingReview } = await supabase
            .from("reviews")
            .select("id")
            .eq("contract_id", contract.id)
            .eq("reviewer_id", userId!)
            .single();

          if (!existingReview && otherPartyProfile) {
            setRatingData({
              revieweeId: otherPartyId,
              revieweeName: otherPartyProfile.full_name,
            });
            setShowRatingPrompt(true);
          }
        }
        // Check if all milestones approved and prompt for renewal
        const allMilestonesApproved = await checkAllMilestonesApproved(contract.id);
        if (allMilestonesApproved && isEmployer) {
          setTimeout(() => {
            setRenewalContract(contract);
            setShowRenewalDialog(true);
          }, 2000);
        }
      }

      toast({
        title: "Success",
        description: newStatus === "approved" 
          ? "Milestone approved! Payment has been released automatically." 
          : "Milestone status updated",
      });

      if (selectedContract) {
        fetchMilestones(selectedContract);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const raiseDispute = async () => {
    if (!disputeReason.trim() || !selectedContract) return;

    try {
      setRaisingDispute(true);
      const { error } = await supabase.from("disputes").insert({
        contract_id: selectedContract,
        raised_by: userId!,
        reason: disputeReason,
      });

      if (error) throw error;

      // Send email notification to other party
      const contract = contracts.find((c) => c.id === selectedContract);
      if (contract) {
        const isEmployer = userId === contract.employer_id;
        const otherPartyId = isEmployer ? contract.talent_id : contract.employer_id;

        // Get profile name (public data)
        const { data: otherPartyProfile } = await supabase
          .from("profiles")
          .select("full_name, user_id")
          .eq("id", otherPartyId)
          .single();
        
        // Get contact info via secure RPC
        const { data: disputeContactInfo } = otherPartyProfile?.user_id 
          ? await supabase.rpc("get_contact_info" as any, { target_user_id: otherPartyProfile.user_id })
          : { data: null };
        
        const disputeEmail = disputeContactInfo?.[0]?.email;

        if (disputeEmail) {
          await supabase.functions.invoke("send-transaction-email", {
            body: {
              to: disputeEmail,
              userName: otherPartyProfile.full_name,
              transactionType: "dispute_raised",
              jobTitle: contract.jobs?.title,
              disputeReason,
            },
          });
        }
      }

      toast({
        title: "Success",
        description: "Dispute raised successfully. An admin will review it soon.",
      });

      setShowDisputeDialog(false);
      setDisputeReason("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRaisingDispute(false);
    }
  };

  const checkAllMilestonesApproved = async (contractId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("milestones")
      .select("status")
      .eq("contract_id", contractId);

    return (data || []).every((m) => m.status === "approved");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      pending: "secondary",
      in_progress: "default",
      submitted: "outline",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading contracts...</div>;
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No contracts yet</p>
      </div>
    );
  }

  const selectedContractData = contracts.find(c => c.id === selectedContract);
  const completedMilestones = milestones.filter(m => m.status === 'approved').length;
  const progress = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contracts.map((contract) => (
          <Card
            key={contract.id}
            className={`p-4 cursor-pointer transition-colors ${
              selectedContract === contract.id ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedContract(contract.id)}
          >
            <h3 className="font-semibold mb-2">{contract.jobs.title}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {(contract.total_amount_minor_units / 100).toFixed(2)} {contract.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(contract.status)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedContractData && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">Contract Progress</h2>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  {completedMilestones} of {milestones.length} milestones completed
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={requestPermission}
                  title={permission === "granted" ? "Notifications enabled" : "Enable notifications"}
                >
                  {permission === "granted" ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                </Button>
                
                {selectedContractData.status === "completed" && (
                  <>
                    <InvoiceGenerator
                      invoiceData={{
                        contractId: selectedContractData.id,
                        jobTitle: selectedContractData.jobs.title,
                        employerName: "Employer",
                        talentName: "Talent",
                        currency: selectedContractData.currency,
                        milestones: milestones,
                        totalAmount: selectedContractData.total_amount_minor_units,
                        startDate: selectedContractData.start_date || new Date().toISOString(),
                        endDate: selectedContractData.end_date || new Date().toISOString(),
                        platformFee: Math.round(selectedContractData.total_amount_minor_units * 0.05),
                      }}
                    />
                    {contracts.find((c) => c.id === selectedContract)?.employer_id === userId && (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setRenewalContract(selectedContractData);
                          setShowRenewalDialog(true);
                        }}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Renew Contract
                      </Button>
                    )}
                  </>
                )}
                
                <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Raise Dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Raise a Dispute</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Describe the issue you're experiencing with this contract. An admin will review and help mediate.
                      </p>
                      <Textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={4}
                      />
                      <Button
                        onClick={raiseDispute}
                        disabled={raisingDispute || !disputeReason.trim()}
                        className="w-full"
                      >
                        {raisingDispute ? "Submitting..." : "Submit Dispute"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Milestones</h3>
              {milestones.map((milestone) => (
                <Card key={milestone.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(milestone.status)}
                      <div>
                        <h4 className="font-semibold">{milestone.title}</h4>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {(milestone.amount_minor_units / 100).toFixed(2)} {selectedContractData.currency}
                      </div>
                      {getStatusBadge(milestone.status)}
                    </div>
                  </div>
                  {milestone.due_date && (
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(milestone.due_date).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    {milestone.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateMilestoneStatus(milestone.id, 'in_progress')}
                      >
                        Start Work
                      </Button>
                    )}
                    {milestone.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateMilestoneStatus(milestone.id, 'submitted')}
                      >
                        Submit for Review
                      </Button>
                    )}
                    {milestone.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateMilestoneStatus(milestone.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve & Release Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateMilestoneStatus(milestone.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {userId && (
            <ContractChat contractId={selectedContract} currentUserId={userId} />
          )}
        </>
      )}

      {showRatingPrompt && ratingData && selectedContract && userId && (
        <RatingPrompt
          isOpen={showRatingPrompt}
          onClose={() => {
            setShowRatingPrompt(false);
            setRatingData(null);
          }}
          contractId={selectedContract}
          revieweeId={ratingData.revieweeId}
          revieweeName={ratingData.revieweeName}
          reviewerId={userId}
        />
      )}

      {showRenewalDialog && renewalContract && (
        <ContractRenewalDialog
          isOpen={showRenewalDialog}
          onClose={() => {
            setShowRenewalDialog(false);
            setRenewalContract(null);
            fetchContracts();
          }}
          originalContract={renewalContract}
          talentName="Talent"
        />
      )}

      {selectedContract && userId && (
        <ContractAmendments
          contractId={selectedContract}
          userId={userId}
          isEmployer={contracts.find((c) => c.id === selectedContract)?.employer_id === userId}
        />
      )}
    </div>
  );
};