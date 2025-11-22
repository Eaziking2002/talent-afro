import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManualPaymentRequest {
  jobId: string;
  amount: number;
  currency: string;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { jobId, amount, currency, description }: ManualPaymentRequest = await req.json();

    // Calculate fees (10% platform fee)
    const amountMinor = Math.round(amount * 100);
    const platformFee = Math.round(amountMinor * 0.10);
    const netAmount = amountMinor - platformFee;

    // Get user profile to get the user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      throw new Error('Profile not found');
    }

    // Create pending transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        from_user_id: user.id,
        job_id: jobId,
        amount_minor_units: amountMinor,
        platform_fee_minor_units: platformFee,
        net_amount_minor_units: netAmount,
        currency: currency.toUpperCase(),
        type: 'escrow',
        status: 'pending',
        payment_provider: 'manual_transfer',
        description: description,
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction creation error:', txError);
      throw new Error('Failed to create transaction');
    }

    console.log('Manual payment initialized:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: transaction,
        amount: amountMinor,
        platformFee: platformFee,
        netAmount: netAmount,
        message: 'Please upload payment proof to complete the transaction',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in payment-manual-initialize:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
