-- Create storage bucket for portfolio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolios', 'portfolios', true);

-- Portfolio items table
CREATE TABLE public.portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'document', 'certificate'
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all portfolio items"
ON public.portfolio_items FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own portfolio items"
ON public.portfolio_items FOR ALL
USING (auth.uid() = user_id);

-- Storage policies for portfolios
CREATE POLICY "Anyone can view portfolio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolios');

CREATE POLICY "Users can upload their own portfolio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own portfolio files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own portfolio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL,
  talent_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, completed, disputed, cancelled
  total_amount_minor_units BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view contracts"
ON public.contracts FOR SELECT
USING (auth.uid() = employer_id OR auth.uid() = talent_id);

CREATE POLICY "Employers can create contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Contract parties can update contracts"
ON public.contracts FOR UPDATE
USING (auth.uid() = employer_id OR auth.uid() = talent_id);

-- Milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount_minor_units BIGINT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, submitted, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view milestones"
ON public.milestones FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.contracts
  WHERE contracts.id = milestones.contract_id
  AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
));

CREATE POLICY "Contract parties can manage milestones"
ON public.milestones FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.contracts
  WHERE contracts.id = milestones.contract_id
  AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
));

-- Deliverables table
CREATE TABLE public.deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  file_url TEXT,
  description TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'submitted' -- submitted, approved, rejected
);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view deliverables"
ON public.deliverables FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.milestones m
  JOIN public.contracts c ON m.contract_id = c.id
  WHERE m.id = deliverables.milestone_id
  AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
));

CREATE POLICY "Talents can submit deliverables"
ON public.deliverables FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Contract parties can update deliverables"
ON public.deliverables FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.milestones m
  JOIN public.contracts c ON m.contract_id = c.id
  WHERE m.id = deliverables.milestone_id
  AND (c.employer_id = auth.uid() OR c.talent_id = auth.uid())
));

-- Disputes table
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_review, resolved, closed
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract parties can view disputes"
ON public.disputes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.contracts
  WHERE contracts.id = disputes.contract_id
  AND (contracts.employer_id = auth.uid() OR contracts.talent_id = auth.uid())
));

CREATE POLICY "Contract parties can create disputes"
ON public.disputes FOR INSERT
WITH CHECK (auth.uid() = raised_by);

CREATE POLICY "Admins can update disputes"
ON public.disputes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT
USING (true);

CREATE POLICY "Contract parties can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = reviews.contract_id
    AND contracts.status = 'completed'
    AND (contracts.employer_id = reviewer_id OR contracts.talent_id = reviewer_id)
  )
);

-- Video calls table for WebRTC signaling
CREATE TABLE public.video_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed, cancelled
  room_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call parties can view video calls"
ON public.video_calls FOR SELECT
USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create video calls"
ON public.video_calls FOR INSERT
WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Call parties can update video calls"
ON public.video_calls FOR UPDATE
USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_calls;

-- Update profiles table to include average rating
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Update employers table to include average rating
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0;
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to update average ratings
CREATE OR REPLACE FUNCTION update_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update talent rating
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.reviewee_id) THEN
    UPDATE profiles
    SET 
      average_rating = (
        SELECT AVG(rating)::numeric(3,2)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id
      )
    WHERE user_id = NEW.reviewee_id;
  END IF;
  
  -- Update employer rating
  IF EXISTS (SELECT 1 FROM employers WHERE user_id = NEW.reviewee_id) THEN
    UPDATE employers
    SET 
      average_rating = (
        SELECT AVG(rating)::numeric(3,2)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id
      )
    WHERE user_id = NEW.reviewee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update ratings
CREATE TRIGGER update_ratings_on_review
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_average_rating();

-- Trigger for updated_at
CREATE TRIGGER update_portfolio_items_updated_at
BEFORE UPDATE ON public.portfolio_items
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();