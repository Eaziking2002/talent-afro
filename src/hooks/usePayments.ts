import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PaymentInitializeParams {
  jobId: string;
  amount: number;
  currency: string;
  description: string;
}

export interface EscrowReleaseParams {
  jobId: string;
  applicationId: string;
}

export interface PayoutWithdrawParams {
  amount: number;
  accountNumber: string;
  accountBank: string;
  currency: string;
}

export const usePayments = () => {
  const initializePayment = async (params: PaymentInitializeParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('payment-initialize', {
        body: params,
      });

      if (error) throw error;

      if (data.success && data.paymentLink) {
        // Open payment link in new window
        window.open(data.paymentLink, '_blank');
        
        toast({
          title: "Payment Initialized",
          description: `Amount: ${(params.amount / 100).toFixed(2)} ${params.currency}. Platform fee: ${(data.platformFee / 100).toFixed(2)} ${params.currency}`,
        });

        return data;
      }

      throw new Error('Failed to initialize payment');
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initialize payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const releaseEscrow = async (params: EscrowReleaseParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('escrow-release', {
        body: params,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Escrow Released",
          description: `Amount released: ${(data.amountReleased / 100).toFixed(2)}. Platform fee: ${(data.platformFee / 100).toFixed(2)}`,
        });

        return data;
      }

      throw new Error('Failed to release escrow');
    } catch (error) {
      console.error('Escrow release error:', error);
      toast({
        title: "Release Failed",
        description: error instanceof Error ? error.message : "Failed to release escrow",
        variant: "destructive",
      });
      throw error;
    }
  };

  const withdrawPayout = async (params: PayoutWithdrawParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('payout-withdraw', {
        body: params,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Withdrawal Initiated",
          description: `Amount: ${(data.amount / 100).toFixed(2)} ${params.currency}. Status: ${data.status}`,
        });

        return data;
      }

      throw new Error('Failed to withdraw funds');
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : "Failed to withdraw funds",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    initializePayment,
    releaseEscrow,
    withdrawPayout,
  };
};
