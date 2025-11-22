import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentProofRequest {
  transactionId: string;
  proofUrl: string;
  bankDetails?: string;
  notes?: string;
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

    const { transactionId, proofUrl, bankDetails, notes }: PaymentProofRequest = await req.json();

    // Verify transaction belongs to user
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('from_user_id', user.id)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found or unauthorized');
    }

    // Submit payment proof
    const { data: proof, error: proofError } = await supabase
      .from('payment_proofs')
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        proof_url: proofUrl,
        bank_details: bankDetails,
        notes: notes,
      })
      .select()
      .single();

    if (proofError) {
      console.error('Payment proof creation error:', proofError);
      throw new Error('Failed to submit payment proof');
    }

    // Send email notification to admins
    try {
      await supabase.functions.invoke('send-transaction-email', {
        body: {
          to: Deno.env.get('ADMIN_EMAIL') || 'admin@example.com',
          type: 'payment_proof_submitted',
          transaction: transaction,
          proofUrl: proofUrl,
        },
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the request if email fails
    }

    console.log('Payment proof submitted:', proof.id);

    return new Response(
      JSON.stringify({
        success: true,
        proof: proof,
        message: 'Payment proof submitted successfully. Waiting for admin verification.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in payment-proof-submit:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
