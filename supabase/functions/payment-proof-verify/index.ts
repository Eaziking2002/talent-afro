import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyProofRequest {
  proofId: string;
  approved: boolean;
  adminNotes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!hasAdminRole) {
      throw new Error('Admin access required');
    }

    const { proofId, approved, adminNotes }: VerifyProofRequest = await req.json();

    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get payment proof with transaction details
    const { data: proof, error: proofError } = await supabaseAdmin
      .from('payment_proofs')
      .select('*, transactions(*)')
      .eq('id', proofId)
      .single();

    if (proofError || !proof) {
      throw new Error('Payment proof not found');
    }

    if (approved) {
      // Update proof as verified
      const { error: updateProofError } = await supabaseAdmin
        .from('payment_proofs')
        .update({
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes: adminNotes || proof.notes,
        })
        .eq('id', proofId);

      if (updateProofError) {
        throw new Error('Failed to update payment proof');
      }

      // Update transaction status to completed
      const { error: txUpdateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'completed',
          payment_metadata: {
            ...proof.transactions.payment_metadata,
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            admin_notes: adminNotes,
          },
        })
        .eq('id', proof.transaction_id);

      if (txUpdateError) {
        throw new Error('Failed to update transaction');
      }

      // Update job status to in_progress
      const { error: jobUpdateError } = await supabaseAdmin
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', proof.transactions.job_id)
        .eq('status', 'open');

      if (jobUpdateError) {
        console.error('Job update error:', jobUpdateError);
      }

      // Send confirmation email to user
      try {
        await supabase.functions.invoke('send-transaction-email', {
          body: {
            userId: proof.user_id,
            type: 'payment_verified',
            transaction: proof.transactions,
          },
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      console.log('Payment verified:', proofId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Reject payment - update transaction to failed
      const { error: txUpdateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'failed',
          payment_metadata: {
            ...proof.transactions.payment_metadata,
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_reason: adminNotes,
          },
        })
        .eq('id', proof.transaction_id);

      if (txUpdateError) {
        throw new Error('Failed to update transaction');
      }

      // Send rejection email to user
      try {
        await supabase.functions.invoke('send-transaction-email', {
          body: {
            userId: proof.user_id,
            type: 'payment_rejected',
            transaction: proof.transactions,
            reason: adminNotes,
          },
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      console.log('Payment rejected:', proofId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment rejected',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('Error in payment-proof-verify:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
