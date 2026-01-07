-- Create blocked_ips table
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  abuse_count INTEGER NOT NULL DEFAULT 1,
  last_abuse_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked IPs
CREATE POLICY "Admins can view blocked IPs"
ON public.blocked_ips FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert blocked IPs"
ON public.blocked_ips FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blocked IPs"
ON public.blocked_ips FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blocked IPs"
ON public.blocked_ips FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if IP is blocked (for edge functions using service role)
CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_ips
    WHERE ip_address = p_ip_address
    AND (is_permanent = true OR expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Function to auto-block IP after repeated abuse
CREATE OR REPLACE FUNCTION public.record_abuse_and_maybe_block(
  p_ip_address TEXT,
  p_reason TEXT DEFAULT 'Rate limit exceeded',
  p_threshold INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_abuse_count INTEGER;
  v_is_blocked BOOLEAN;
BEGIN
  -- Insert or update abuse record
  INSERT INTO blocked_ips (ip_address, reason, abuse_count, is_permanent)
  VALUES (p_ip_address, p_reason, 1, false)
  ON CONFLICT (ip_address) DO UPDATE SET
    abuse_count = blocked_ips.abuse_count + 1,
    last_abuse_at = now(),
    reason = COALESCE(EXCLUDED.reason, blocked_ips.reason)
  RETURNING abuse_count INTO v_abuse_count;
  
  -- Auto-block if threshold exceeded
  IF v_abuse_count >= p_threshold THEN
    UPDATE blocked_ips
    SET is_permanent = false,
        expires_at = now() + INTERVAL '24 hours'
    WHERE ip_address = p_ip_address
    AND is_permanent = false;
    v_is_blocked := true;
  ELSE
    v_is_blocked := false;
  END IF;
  
  RETURN jsonb_build_object(
    'abuse_count', v_abuse_count,
    'is_blocked', v_is_blocked,
    'threshold', p_threshold
  );
END;
$$;

-- Index for fast IP lookups
CREATE INDEX idx_blocked_ips_address ON public.blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_expires ON public.blocked_ips(expires_at) WHERE expires_at IS NOT NULL;