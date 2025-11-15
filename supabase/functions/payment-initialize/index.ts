import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  jobId: string;
  amount: number;
  currency: string;
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { jobId, amount, currency, description }: PaymentRequest = await req.json();

    console.log('Initializing payment:', { jobId, amount, currency, userId: user.id });

    // Calculate platform fee (10% commission)
    const platformFeeMinorUnits = Math.floor(amount * 0.10);
    const netAmountMinorUnits = amount - platformFeeMinorUnits;

    // Get Flutterwave secret key
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      throw new Error('Flutterwave secret key not configured');
    }

    // Get user profile for customer info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', user.id)
      .single();

    // Create payment with Flutterwave
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: `job-${jobId}-${Date.now()}`,
        amount: amount / 100, // Convert from minor units to major units
        currency: currency,
        redirect_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
        customer: {
          email: user.email,
          name: profile?.full_name || 'User',
        },
        customizations: {
          title: 'Job Payment',
          description: description,
        },
        meta: {
          job_id: jobId,
          user_id: user.id,
          platform_fee: platformFeeMinorUnits,
          net_amount: netAmountMinorUnits,
        },
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (flutterwaveData.status !== 'success') {
      console.error('Flutterwave error:', flutterwaveData);
      throw new Error('Failed to initialize payment with Flutterwave');
    }

    // Create escrow transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        job_id: jobId,
        from_user_id: user.id,
        amount_minor_units: amount,
        platform_fee_minor_units: platformFeeMinorUnits,
        net_amount_minor_units: netAmountMinorUnits,
        currency: currency,
        type: 'escrow',
        status: 'pending',
        description: description,
        payment_provider: 'flutterwave',
        external_reference: flutterwaveData.data.tx_ref,
        payment_metadata: {
          payment_link: flutterwaveData.data.link,
          flutterwave_id: flutterwaveData.data.id,
        },
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw transactionError;
    }

    console.log('Payment initialized successfully:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        paymentLink: flutterwaveData.data.link,
        amount: amount,
        platformFee: platformFeeMinorUnits,
        netAmount: netAmountMinorUnits,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
