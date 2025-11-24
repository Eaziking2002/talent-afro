-- Create saved_searches table for storing user search preferences
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for saved_searches
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved searches"
ON public.saved_searches
FOR ALL
USING (auth.uid() = user_id);

-- Create service_listings table for skills marketplace
CREATE TABLE public.service_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price_minor_units BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  delivery_days INTEGER NOT NULL,
  requirements TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for service_listings
ALTER TABLE public.service_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service listings"
ON public.service_listings
FOR SELECT
USING (active = true OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = service_listings.talent_id AND profiles.user_id = auth.uid()
));

CREATE POLICY "Talents can manage their own service listings"
ON public.service_listings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = service_listings.talent_id AND profiles.user_id = auth.uid()
));

-- Create service_purchases table
CREATE TABLE public.service_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.service_listings(id),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount_minor_units BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  requirements_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for service_purchases
ALTER TABLE public.service_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchase parties can view purchases"
ON public.service_purchases
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create purchases"
ON public.service_purchases
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Purchase parties can update purchases"
ON public.service_purchases
FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Add last_active_at columns for reputation decay
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to calculate reputation score with decay
CREATE OR REPLACE FUNCTION calculate_reputation_with_decay(
  base_rating NUMERIC,
  total_reviews INTEGER,
  last_active TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create indexes for performance
CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX idx_service_listings_talent_id ON public.service_listings(talent_id);
CREATE INDEX idx_service_listings_active ON public.service_listings(active) WHERE active = true;
CREATE INDEX idx_service_purchases_buyer_id ON public.service_purchases(buyer_id);
CREATE INDEX idx_service_purchases_seller_id ON public.service_purchases(seller_id);
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active_at);
CREATE INDEX idx_employers_last_active ON public.employers(last_active_at);