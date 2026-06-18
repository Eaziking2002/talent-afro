
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;

REVOKE SELECT ON public.referrals FROM authenticated, anon;
GRANT SELECT (id, referrer_id, referred_id, referred_type, status, reward_credits, completed_at, created_at) ON public.referrals TO authenticated;
GRANT INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.tester_feedback;
CREATE POLICY "Authenticated users can submit feedback"
  ON public.tester_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_application_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_application() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_milestone_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_contract_activation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_contract_cancellation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_release_escrow_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_payment_proof_bank_details() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_average_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_employer_trust_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_bank_details(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_bank_details(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_employer_trust_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_reputation_with_decay(numeric, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_milestone_dependencies(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_abuse_and_maybe_block(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_ip_blocked(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_expire_jobs() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_contract_with(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_employer_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_contact_info(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profile_safe(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_job_filled(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_payment_proofs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_payment_proof_with_details(uuid) FROM anon;

DROP POLICY IF EXISTS "Anyone can view portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile videos" ON storage.objects;
DROP POLICY IF EXISTS "Public view profile images" ON storage.objects;
