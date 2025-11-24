import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Contract {
  id: string;
  status: string;
  total_amount_minor_units: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  jobs: { title: string };
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  amount_minor_units: number;
  due_date: string | null;
  status: string;
}

export const ContractManager = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      const { error } = await supabase
        .from('milestones')
        .update({ status: newStatus })
        .eq('id', milestoneId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Milestone status updated",
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
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Contract Progress</h2>
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {completedMilestones} of {milestones.length} milestones completed
            </p>
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
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};