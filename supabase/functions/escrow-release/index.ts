import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReleaseRequest {
  jobId: string;
  applicationId: string;
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

    const { jobId, applicationId }: ReleaseRequest = await req.json();

    console.log('Releasing escrow:', { jobId, applicationId, userId: user.id });

    // Verify user is the employer for this job
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select(`
        *,
        employers!inner(user_id)
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    if (job.employers.user_id !== user.id) {
      throw new Error('Unauthorized: Only the employer can release escrow');
    }

    // Get the application to find the talent
    const { data: application, error: appError } = await supabaseClient
      .from('applications')
      .select('applicant_id')
      .eq('id', applicationId)
      .eq('job_id', jobId)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    // Get the escrow transaction
    const { data: escrowTransaction, error: escrowError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('job_id', jobId)
      .eq('type', 'escrow')
      .eq('status', 'completed')
      .single();

    if (escrowError || !escrowTransaction) {
      throw new Error('Escrow transaction not found or not completed');
    }

    // Get talent's profile to get user_id
    const { data: talentProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('id', application.applicant_id)
      .single();

    if (profileError || !talentProfile) {
      throw new Error('Talent profile not found');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create release transaction
    const { data: releaseTransaction, error: releaseError } = await supabaseAdmin
      .from('transactions')
      .insert({
        job_id: jobId,
        from_user_id: user.id,
        to_user_id: talentProfile.user_id,
        amount_minor_units: escrowTransaction.net_amount_minor_units,
        platform_fee_minor_units: escrowTransaction.platform_fee_minor_units,
        net_amount_minor_units: escrowTransaction.net_amount_minor_units,
        currency: escrowTransaction.currency,
        type: 'release',
        status: 'completed',
        description: `Escrow release for job ${jobId}`,
        payment_provider: 'flutterwave',
      })
      .select()
      .single();

    if (releaseError) {
      console.error('Failed to create release transaction:', releaseError);
      throw releaseError;
    }

    console.log('Release transaction created successfully:', releaseTransaction);

    // Send email notification to talent
    try {
      const { data: talentProfileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('full_name, user_id')
        .eq('user_id', talentProfile.user_id)
        .single();

      if (talentProfileData && !profileError) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(talentProfileData.user_id);
        
        if (userData?.user?.email) {
          const { data: jobData } = await supabaseAdmin
            .from('jobs')
            .select('title')
            .eq('id', jobId)
            .single();

          await supabaseAdmin.functions.invoke('send-transaction-email', {
            body: {
              to: userData.user.email,
              userName: talentProfileData.full_name,
              transactionType: 'release',
              amount: escrowTransaction.net_amount_minor_units,
              currency: escrowTransaction.currency,
              jobTitle: jobData?.title,
              transactionId: releaseTransaction.id,
            }
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the release if email fails
    }

    // Update talent's wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('balance_minor_units')
      .eq('user_id', talentProfile.user_id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet not found, creating one');
      // Create wallet if it doesn't exist
      await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: talentProfile.user_id,
          balance_minor_units: escrowTransaction.net_amount_minor_units,
          currency: escrowTransaction.currency,
        });
    } else {
      // Update existing wallet
      await supabaseAdmin
        .from('wallets')
        .update({
          balance_minor_units: wallet.balance_minor_units + escrowTransaction.net_amount_minor_units,
        })
        .eq('user_id', talentProfile.user_id);
    }

    // Update application status to completed
    await supabaseAdmin
      .from('applications')
      .update({ status: 'completed' })
      .eq('id', applicationId);

    // Update job status to completed
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);

    console.log('Escrow released successfully:', releaseTransaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: releaseTransaction.id,
        amountReleased: escrowTransaction.net_amount_minor_units,
        platformFee: escrowTransaction.platform_fee_minor_units,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Escrow release error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
