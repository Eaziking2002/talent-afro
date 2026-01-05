import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Rate limit helper using IP address
async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = 5,
  windowSeconds = 300
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { allowed: true, remaining: maxRequests, resetAt: new Date().toISOString() };
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  
  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: maxRequests, resetAt: new Date().toISOString() };
  }
  
  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: data.reset_at,
  };
}

// Sanitize input to prevent XSS attacks
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 5000); // Limit length to prevent abuse
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Get client IP from request headers
const getClientIP = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Rate limit by IP (5 contact form submissions per 5 minutes)
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, 'send-contact-email', 5, 300);
    
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for IP ${clientIP} on send-contact-email`);
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please wait a few minutes before trying again.",
          retryAfter: rateLimitResult.resetAt
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders,
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': rateLimitResult.resetAt,
          } 
        }
      );
    }

    const body = await req.json();
    
    // Extract and sanitize inputs
    const name = sanitizeInput(body.name || '');
    const email = sanitizeInput(body.email || '');
    const subject = sanitizeInput(body.subject || '');
    const message = sanitizeInput(body.message || '');

    console.log("Received contact form submission:", { name, email: email.slice(0, 20) + '...', subject });

    // Validate required fields
    if (!name || name.length < 2 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be between 2 and 100 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!subject || subject.length < 3 || subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject must be between 3 and 200 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!message || message.length < 10 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Message must be between 10 and 5000 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send notification email to SkillLink Africa
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SkillLink Africa <onboarding@resend.dev>",
        to: ["skilllinkafrica01@gmail.com"],
        subject: `New Contact: ${subject.slice(0, 100)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>From:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Subject:</strong> ${subject}</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3 style="margin-top: 0;">Message:</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px;">
              This message was sent via the SkillLink Africa contact form.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Failed to send email:", errorData);
      throw new Error("Failed to send email");
    }

    console.log("Email sent successfully to SkillLink Africa");

    // Send confirmation email to the sender
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SkillLink Africa <onboarding@resend.dev>",
        to: [email],
        subject: "Thank you for contacting SkillLink Africa!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Thank You, ${name}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6;">
              We have received your message and appreciate you reaching out to SkillLink Africa.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Our team will review your inquiry and get back to you as soon as possible.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                <strong>Your Message:</strong><br>
                <em>${subject}</em>
              </p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Best regards,<br>
              <strong>Ezekiel Sesay (Eazi)</strong><br>
              Founder, SkillLink Africa
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              SkillLink Africa - Connecting Africans to Global Opportunities
            </p>
          </div>
        `,
      }),
    });

    console.log("Confirmation email sent to sender");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
