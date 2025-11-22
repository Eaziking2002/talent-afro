import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export interface ManualPaymentParams {
  jobId: string;
  amount: number;
  currency: string;
  description: string;
}

export interface PaymentProofParams {
  transactionId: string;
  file: File;
  bankDetails?: string;
  notes?: string;
}

export const useManualPayments = () => {
  const [uploading, setUploading] = useState(false);

  const initializeManualPayment = async (params: ManualPaymentParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('payment-manual-initialize', {
        body: params,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Initialized",
          description: `Amount: ${(params.amount).toFixed(2)} ${params.currency}. Please upload payment proof to complete.`,
        });

        return data;
      }

      throw new Error('Failed to initialize manual payment');
    } catch (error) {
      console.error('Manual payment initialization error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initialize payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const submitPaymentProof = async (params: PaymentProofParams) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = params.file.name.split('.').pop();
      const fileName = `${user.id}/${params.transactionId}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, params.file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Submit proof with URL
      const { data, error } = await supabase.functions.invoke('payment-proof-submit', {
        body: {
          transactionId: params.transactionId,
          proofUrl: publicUrl,
          bankDetails: params.bankDetails,
          notes: params.notes,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Proof Submitted",
          description: "Your payment proof has been submitted and is awaiting verification.",
        });

        return data;
      }

      throw new Error('Failed to submit payment proof');
    } catch (error) {
      console.error('Payment proof submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit payment proof",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    initializeManualPayment,
    submitPaymentProof,
    uploading,
  };
};
