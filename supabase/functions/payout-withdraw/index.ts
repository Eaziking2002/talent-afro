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

async function refundWallet(admin: ReturnType<typeof createClient>, userId: string, amount: number) {
  // Best-effort refund using a direct increment via service role
  const { data: w } = await admin.from('wallets').select('balance_minor_units').eq('user_id', userId).single();
  if (w) {
    await admin
      .from('wallets')
      .update({ balance_minor_units: (w.balance_minor_units as number) + amount })
      .eq('user_id', userId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as WithdrawRequest;
    const { amount, accountNumber, accountBank, currency } = body;

    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!accountNumber || !accountBank || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing withdrawal:', { amount, userId: user.id });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Atomic conditional debit — only succeeds if balance is sufficient.
    const { data: debitOk, error: debitError } = await supabaseAdmin.rpc(
      'wallet_atomic_debit',
      { p_user_id: user.id, p_amount: amount }
    );
    if (debitError) {
      console.error('Atomic debit error:', debitError);
      return new Response(JSON.stringify({ error: 'Wallet operation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!debitOk) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      await refundWallet(supabaseAdmin, user.id, amount);
      return new Response(JSON.stringify({ error: 'Payment provider not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_bank: accountBank,
        account_number: accountNumber,
        amount: amount / 100,
        currency,
        narration: 'Payout withdrawal',
        reference: `payout-${user.id}-${Date.now()}`,
        beneficiary_name: profile?.full_name || 'User',
        meta: { user_id: user.id },
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (flutterwaveData.status !== 'success') {
      console.error('Flutterwave transfer error:', flutterwaveData);
      await refundWallet(supabaseAdmin, user.id, amount);
      return new Response(JSON.stringify({ error: 'Failed to initiate transfer' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        from_user_id: user.id,
        amount_minor_units: amount,
        platform_fee_minor_units: 0,
        net_amount_minor_units: amount,
        currency,
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
      // Funds already moved externally; surface generic error
      return new Response(JSON.stringify({ error: 'Failed to record transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Withdrawal initiated successfully:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        amount,
        status: 'pending',
        reference: flutterwaveData.data.reference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Withdrawal error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
