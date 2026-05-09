SELECT cron.unschedule('daily-job-scraper') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-job-scraper');
SELECT cron.unschedule('job-scraper-every-10-minutes') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'job-scraper-every-10-minutes');

UPDATE public.jobs
SET status = 'closed', verification_status = 'rejected'
WHERE status = 'open'
  AND source = 'ai_scraped';

UPDATE public.jobs
SET status = 'closed', verification_status = 'rejected'
WHERE status = 'open'
  AND source = 'adzuna'
  AND external_url LIKE 'https://www.adzuna.com/details/%';