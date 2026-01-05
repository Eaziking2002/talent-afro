-- Create rate_limits table to track API request counts
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for efficient lookups
CREATE UNIQUE INDEX idx_rate_limits_identifier_endpoint_window 
ON public.rate_limits (identifier, endpoint, window_start);

-- Create index for cleanup queries
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits (window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no user access needed)
CREATE POLICY "Service role only" 
ON public.rate_limits 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
  v_result JSONB;
BEGIN
  -- Calculate current window start (truncated to window size)
  v_window_start := date_trunc('minute', now()) - 
    (EXTRACT(EPOCH FROM date_trunc('minute', now()))::INTEGER % p_window_seconds) * INTERVAL '1 second';
  
  -- Try to insert or update the rate limit record
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, v_window_start)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;
  
  -- Build result
  v_result := jsonb_build_object(
    'allowed', v_current_count <= p_max_requests,
    'current_count', v_current_count,
    'max_requests', p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_current_count),
    'reset_at', v_window_start + (p_window_seconds * INTERVAL '1 second')
  );
  
  RETURN v_result;
END;
$$;

-- Function to clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;