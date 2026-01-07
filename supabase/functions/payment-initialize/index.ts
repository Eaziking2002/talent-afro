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

// Get client IP from request headers
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

// Check if IP is blocked
async function checkIPBlocked(ipAddress: string): Promise<boolean> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data, error } = await supabaseAdmin.rpc('is_ip_blocked', {
    p_ip_address: ipAddress,
  });
  
  if (error) {
    console.error('IP block check error:', error);
    return false;
  }
  
  return data === true;
}

// Record abuse and potentially auto-block
async function recordAbuse(ipAddress: string, reason: string): Promise<void> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  await supabaseAdmin.rpc('record_abuse_and_maybe_block', {
    p_ip_address: ipAddress,
    p_reason: reason,
    p_threshold: 10,
  });
}

// Rate limit helper
async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = 10,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  }) as { data: { allowed: boolean; remaining: number; reset_at: string } | null; error: unknown };
  
  if (error || !data) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: maxRequests, resetAt: new Date().toISOString() };
  }
  
  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: data.reset_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if IP is blocked
    const clientIP = getClientIP(req);
    const isBlocked = await checkIPBlocked(clientIP);
    if (isBlocked) {
      console.log(`Blocked IP ${clientIP} attempted payment-initialize`);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Check rate limit (10 payment initializations per minute per user)
    const rateLimitResult = await checkRateLimit(user.id, 'payment-initialize', 10, 60);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${user.id} on payment-initialize`);
      // Record abuse for rate limit violations
      await recordAbuse(clientIP, 'Payment rate limit exceeded');
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait before making another payment request.',
          retryAfter: rateLimitResult.resetAt
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': rateLimitResult.resetAt,
          } 
        }
      );
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
