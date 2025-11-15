import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawRequest {
  amount: number;
  accountNumber: string;
  accountBank: string;
  currency: string;
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

    const { amount, accountNumber, accountBank, currency }: WithdrawRequest = await req.json();

    console.log('Processing withdrawal:', { amount, userId: user.id });

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance_minor_units < amount) {
      throw new Error('Insufficient balance');
    }

    // Get Flutterwave secret key
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      throw new Error('Flutterwave secret key not configured');
    }

    // Get user profile for beneficiary info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Initiate transfer with Flutterwave
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_bank: accountBank,
        account_number: accountNumber,
        amount: amount / 100, // Convert from minor units to major units
        currency: currency,
        narration: 'Payout withdrawal',
        reference: `payout-${user.id}-${Date.now()}`,
        beneficiary_name: profile?.full_name || 'User',
        meta: {
          user_id: user.id,
        },
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (flutterwaveData.status !== 'success') {
      console.error('Flutterwave transfer error:', flutterwaveData);
      throw new Error(flutterwaveData.message || 'Failed to initiate transfer');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create payout transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        from_user_id: user.id,
        amount_minor_units: amount,
        platform_fee_minor_units: 0,
        net_amount_minor_units: amount,
        currency: currency,
        type: 'payout',
        status: 'pending',
        description: 'Withdrawal to bank account',
        payment_provider: 'flutterwave',
        external_reference: flutterwaveData.data.reference,
        payment_metadata: {
          transfer_id: flutterwaveData.data.id,
          account_number: accountNumber,
          account_bank: accountBank,
        },
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw transactionError;
    }

    // Update wallet balance
    await supabaseAdmin
      .from('wallets')
      .update({
        balance_minor_units: wallet.balance_minor_units - amount,
      })
      .eq('user_id', user.id);

    console.log('Withdrawal initiated successfully:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        amount: amount,
        status: 'pending',
        reference: flutterwaveData.data.reference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Withdrawal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
