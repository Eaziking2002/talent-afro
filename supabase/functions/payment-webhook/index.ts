import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('Webhook received:', payload);

    // Verify webhook signature (Flutterwave sends a verification hash)
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      throw new Error('Flutterwave secret key not configured');
    }

    const secretHash = Deno.env.get('FLUTTERWAVE_WEBHOOK_SECRET_HASH');
    const signature = req.headers.get('verif-hash');
    
    if (secretHash && signature !== secretHash) {
      console.error('Invalid webhook signature');
      throw new Error('Invalid signature');
    }

    // Process payment confirmation
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const txRef = payload.data.tx_ref;
      const flutterwaveId = payload.data.id;

      console.log('Processing successful payment:', txRef);

      // Find the transaction by external reference
      const { data: transaction, error: findError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('external_reference', txRef)
        .single();

      if (findError || !transaction) {
        console.error('Transaction not found:', txRef, findError);
        throw new Error('Transaction not found');
      }

      // Update transaction status to completed
      const { error: updateError } = await supabaseClient
        .from('transactions')
        .update({
          status: 'completed',
          payment_metadata: {
            ...transaction.payment_metadata,
            flutterwave_payment_id: flutterwaveId,
            completed_at: new Date().toISOString(),
          },
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Failed to update transaction:', updateError);
        throw updateError;
      }

      console.log('Transaction marked as completed:', transaction.id);

      // Send email notification
      try {
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('full_name, user_id')
          .eq('user_id', transaction.from_user_id)
          .single();

        if (profileData) {
          const { data: userData } = await supabaseClient.auth.admin.getUserById(profileData.user_id);
          
          if (userData?.user?.email) {
            await supabaseClient.functions.invoke('send-transaction-email', {
              body: {
                to: userData.user.email,
                userName: profileData.full_name,
                transactionType: 'payment',
                amount: transaction.amount_minor_units,
                currency: transaction.currency,
                jobTitle: transaction.description,
                transactionId: transaction.id,
              }
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the webhook if email fails
      }

      // Update job status to in_progress if it was open
      const { error: jobUpdateError } = await supabaseClient
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', transaction.job_id)
        .eq('status', 'open');

      if (jobUpdateError) {
        console.error('Failed to update job status:', jobUpdateError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle failed payments
    if (payload.event === 'charge.failed' || payload.data.status === 'failed') {
      const txRef = payload.data.tx_ref;

      console.log('Processing failed payment:', txRef);

      const { error: updateError } = await supabaseClient
        .from('transactions')
        .update({ status: 'failed' })
        .eq('external_reference', txRef);

      if (updateError) {
        console.error('Failed to update transaction:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Failed payment recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
