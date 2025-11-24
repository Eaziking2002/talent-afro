-- Fix search_path for calculate_reputation_with_decay function
CREATE OR REPLACE FUNCTION calculate_reputation_with_decay(
  base_rating NUMERIC,
  total_reviews INTEGER,
  last_active TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_inactive INTEGER;
  decay_factor NUMERIC;
BEGIN
  -- Calculate days since last activity
  days_inactive := EXTRACT(DAY FROM (now() - last_active));
  
  -- Apply decay: lose 1% per 30 days of inactivity, max 50% decay
  decay_factor := GREATEST(0.5, 1.0 - (days_inactive / 30.0 * 0.01));
  
  -- Return decayed rating
  RETURN base_rating * decay_factor;
END;
$$;