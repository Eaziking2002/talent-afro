import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";

interface PaymentProof {
  id: string;
  transaction_id: string;
  user_id: string;
  proof_url: string;
  bank_details: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  transactions: {
    id: string;
    amount_minor_units: number;
    currency: string;
    description: string;
    status: string;
  };
}

const AdminPaymentVerification = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAndFetchProofs();
  }, []);

  const checkAdminAndFetchProofs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: hasAdminRole } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (!hasAdminRole) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchPendingProofs();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          transactions(*)
        `)
        .is('verified_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProofs(data || []);
    } catch (error) {
      console.error('Error fetching payment proofs:', error);
      toast({
        title: "Error",
        description: "Failed to load payment proofs",
        variant: "destructive",
      });
    }
  };

  const handleVerify = async (proofId: string, approved: boolean) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment-proof-verify', {
        body: {
          proofId,
          approved,
          adminNotes,
        },
      });

      if (error) throw error;

      toast({
        title: approved ? "Payment Approved" : "Payment Rejected",
        description: data.message,
      });

      setSelectedProof(null);
      setAdminNotes("");
      await fetchPendingProofs();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Payment Verification</h1>
          <p className="text-muted-foreground">Review and verify manual payment submissions</p>
        </div>

        {proofs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No pending payment proofs</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {proofs.map((proof) => (
              <Card key={proof.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        {(proof.transactions.amount_minor_units / 100).toFixed(2)} {proof.transactions.currency}
                      </CardTitle>
                      <CardDescription>{proof.transactions.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">Pending Review</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Transaction ID</p>
                      <p className="font-mono">{proof.transaction_id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p>{new Date(proof.created_at).toLocaleString()}</p>
                    </div>
                    {proof.bank_details && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Bank Details</p>
                        <p>{proof.bank_details}</p>
                      </div>
                    )}
                    {proof.notes && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">User Notes</p>
                        <p>{proof.notes}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      onClick={() => window.open(proof.proof_url, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Payment Proof
                    </Button>
                  </div>

                  {selectedProof === proof.id ? (
                    <div className="space-y-4 p-4 bg-muted rounded-lg">
                      <div>
                        <Label htmlFor={`notes-${proof.id}`}>Admin Notes</Label>
                        <Textarea
                          id={`notes-${proof.id}`}
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add verification notes..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleVerify(proof.id, true)}
                          disabled={processing}
                          className="flex-1"
                        >
                          {processing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Approve Payment
                        </Button>
                        <Button
                          onClick={() => handleVerify(proof.id, false)}
                          disabled={processing}
                          variant="destructive"
                          className="flex-1"
                        >
                          {processing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          Reject Payment
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedProof(null);
                            setAdminNotes("");
                          }}
                          variant="ghost"
                          disabled={processing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setSelectedProof(proof.id)}
                      variant="outline"
                      className="w-full"
                    >
                      Review & Verify
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentVerification;
