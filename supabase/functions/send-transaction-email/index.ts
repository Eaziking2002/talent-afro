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
  transactionType: "payment_released" | "dispute_raised" | "dispute_resolved" | "escrow_funded" | "refund_processed" | "payment" | "release" | "payout";
  amount?: number;
  currency?: string;
  jobTitle?: string;
  transactionId?: string;
  disputeReason?: string;
  disputeResolution?: string;
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

    const emailData: EmailRequest = await req.json();

    console.log("Sending email notification:", { to: emailData.to, transactionType: emailData.transactionType });

    let subject = "";
    let htmlContent = "";

    const formattedAmount = emailData.amount && emailData.currency 
      ? `${emailData.amount.toFixed(2)} ${emailData.currency}`
      : "";

    switch (emailData.transactionType) {
      case "payment_released":
        subject = "💰 Milestone Payment Released";
        htmlContent = `
          <h1>Payment Released</h1>
          <p>Hi ${emailData.userName},</p>
          <p>Great news! A milestone payment has been released to your wallet.</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Job:</strong> ${emailData.jobTitle}</p>
            <p><strong>Amount:</strong> ${formattedAmount}</p>
            <p><strong>Transaction ID:</strong> ${emailData.transactionId}</p>
          </div>
          <p>You can now withdraw these funds from your wallet.</p>
          <p>Best regards,<br>The Team</p>
        `;
        break;

      case "dispute_raised":
        subject = "⚠️ Dispute Raised on Contract";
        htmlContent = `
          <h1>Dispute Raised</h1>
          <p>Hi ${emailData.userName},</p>
          <p>A dispute has been raised on one of your contracts.</p>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Job:</strong> ${emailData.jobTitle}</p>
            <p><strong>Reason:</strong> ${emailData.disputeReason}</p>
          </div>
          <p>Our admin team will review this dispute and work towards a resolution.</p>
          <p>Best regards,<br>The Team</p>
        `;
        break;

      case "dispute_resolved":
        subject = "✅ Dispute Resolved";
        htmlContent = `
          <h1>Dispute Resolved</h1>
          <p>Hi ${emailData.userName},</p>
          <p>The dispute on your contract has been resolved.</p>
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Job:</strong> ${emailData.jobTitle}</p>
            <p><strong>Resolution:</strong> ${emailData.disputeResolution}</p>
          </div>
          <p>Thank you for your patience during the resolution process.</p>
          <p>Best regards,<br>The Team</p>
        `;
        break;

      case "escrow_funded":
        subject = "🔒 Escrow Funded for Your Contract";
        htmlContent = `
          <h1>Escrow Funded</h1>
          <p>Hi ${emailData.userName},</p>
          <p>The escrow for your contract has been successfully funded.</p>
          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Job:</strong> ${emailData.jobTitle}</p>
            <p><strong>Amount:</strong> ${formattedAmount}</p>
          </div>
          <p>Funds are now held securely in escrow and will be released as milestones are completed.</p>
          <p>Best regards,<br>The Team</p>
        `;
        break;

      case "refund_processed":
        subject = "💳 Refund Processed";
        htmlContent = `
          <h1>Refund Processed</h1>
          <p>Hi ${emailData.userName},</p>
          <p>A refund has been processed due to contract cancellation.</p>
          <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Job:</strong> ${emailData.jobTitle}</p>
            <p><strong>Refund Amount:</strong> ${formattedAmount}</p>
          </div>
          <p>The refund has been added to your wallet.</p>
          <p>Best regards,<br>The Team</p>
        `;
        break;
      case "payment":
        subject = "Payment Received - Escrow Secured";
        htmlContent = `
          <h1>Payment Confirmed</h1>
          <p>Hello ${emailData.userName},</p>
          <p>Great news! A payment of <strong>${formattedAmount}</strong> has been received and secured in escrow${emailData.jobTitle ? ` for the job: <strong>${emailData.jobTitle}</strong>` : ''}.</p>
          <p><strong>Transaction ID:</strong> ${emailData.transactionId}</p>
          <p>The funds will be released to the talent once the work is completed and approved.</p>
          <p>Thank you for using our platform!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
        `;
        break;

      case "release":
        subject = "Funds Released - Payment Complete";
        htmlContent = `
          <h1>Funds Released</h1>
          <p>Hello ${emailData.userName},</p>
          <p>Congratulations! Funds of <strong>${formattedAmount}</strong> have been released${emailData.jobTitle ? ` for the job: <strong>${emailData.jobTitle}</strong>` : ''}.</p>
          <p><strong>Transaction ID:</strong> ${emailData.transactionId}</p>
          <p>The funds are now available in your wallet and can be withdrawn to your bank account.</p>
          <p>Thank you for your excellent work!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
        `;
        break;

      case "payout":
        subject = "Withdrawal Processing";
        htmlContent = `
          <h1>Withdrawal Initiated</h1>
          <p>Hello ${emailData.userName},</p>
          <p>Your withdrawal request of <strong>${formattedAmount}</strong> is being processed.</p>
          <p><strong>Transaction ID:</strong> ${emailData.transactionId}</p>
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
        from: "Gig Platform <onboarding@resend.dev>",
        to: [emailData.to],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const resendResponse = await emailResponse.json();
    console.log("Email sent successfully:", resendResponse);

    return new Response(JSON.stringify({ success: true, resendResponse }), {
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
