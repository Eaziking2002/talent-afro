
-- Target companies for Firecrawl career-page crawler
CREATE TABLE IF NOT EXISTS public.target_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  careers_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  last_jobs_found INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (careers_url)
);

ALTER TABLE public.target_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage target companies"
ON public.target_companies
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER target_companies_updated_at
BEFORE UPDATE ON public.target_companies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed an initial set of public careers pages
INSERT INTO public.target_companies (company_name, careers_url) VALUES
  ('Stripe', 'https://stripe.com/jobs/search'),
  ('Shopify', 'https://www.shopify.com/careers/search'),
  ('GitLab', 'https://about.gitlab.com/jobs/all-jobs/'),
  ('Automattic', 'https://automattic.com/work-with-us/'),
  ('Zapier', 'https://zapier.com/jobs'),
  ('Vercel', 'https://vercel.com/careers'),
  ('Andela', 'https://andela.com/careers/'),
  ('Flutterwave', 'https://flutterwave.com/ng/careers'),
  ('Paystack', 'https://paystack.com/careers'),
  ('M-KOPA', 'https://m-kopa.com/careers/'),
  ('Jumia', 'https://group.jumia.com/careers'),
  ('Twiga Foods', 'https://twiga.com/careers/'),
  ('Chipper Cash', 'https://chippercash.com/careers'),
  ('Kuda', 'https://kuda.com/careers'),
  ('SafeBoda', 'https://safeboda.com/careers/'),
  ('PalmPay', 'https://www.palmpay.com/careers'),
  ('Yellow Card', 'https://yellowcard.io/careers/'),
  ('Sendwave', 'https://www.sendwave.com/careers')
ON CONFLICT (careers_url) DO NOTHING;

-- Schedule both crawlers every 6 hours
SELECT cron.unschedule('job-aggregator-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'job-aggregator-hourly');
SELECT cron.unschedule('job-aggregator-6h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'job-aggregator-6h');
SELECT cron.unschedule('firecrawl-career-crawler-6h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'firecrawl-career-crawler-6h');
