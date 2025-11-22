import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  userName: string;
  transactionType: 'payment' | 'release' | 'payout';
  amount: number;
  currency: string;
  jobTitle?: string;
  transactionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { to, userName, transactionType, amount, currency, jobTitle, transactionId }: EmailRequest = await req.json();

      console.log("Sending email notification:", { to, transactionType, amount, currency });

    let subject = "";
    let htmlContent = "";

    const formattedAmount = `${(amount / 100).toFixed(2)} ${currency}`;

    switch (transactionType) {
      case 'payment':
        subject = "Payment Received - Escrow Secured";
        htmlContent = `
          <h1>Payment Confirmed</h1>
          <p>Hello ${userName},</p>
          <p>Great news! A payment of <strong>${formattedAmount}</strong> has been received and secured in escrow${jobTitle ? ` for the job: <strong>${jobTitle}</strong>` : ''}.</p>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p>The funds will be released to the talent once the work is completed and approved.</p>
          <p>Thank you for using our platform!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
        `;
        break;

      case 'release':
        subject = "Funds Released - Payment Complete";
        htmlContent = `
          <h1>Funds Released</h1>
          <p>Hello ${userName},</p>
          <p>Congratulations! Funds of <strong>${formattedAmount}</strong> have been released${jobTitle ? ` for the job: <strong>${jobTitle}</strong>` : ''}.</p>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p>The funds are now available in your wallet and can be withdrawn to your bank account.</p>
          <p>Thank you for your excellent work!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
        `;
        break;

      case 'payout':
        subject = "Withdrawal Processing";
        htmlContent = `
          <h1>Withdrawal Initiated</h1>
          <p>Hello ${userName},</p>
          <p>Your withdrawal request of <strong>${formattedAmount}</strong> is being processed.</p>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p>The funds should arrive in your bank account within 1-3 business days.</p>
          <p>We'll notify you once the transfer is complete.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
        `;
        break;
    }

    // Send email using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GigPlatform <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
