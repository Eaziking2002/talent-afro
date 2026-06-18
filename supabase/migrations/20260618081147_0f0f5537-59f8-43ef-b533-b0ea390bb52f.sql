
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_contract_with(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_employer_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_contact_info(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_safe(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_job_filled(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pending_payment_proofs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_payment_proof_with_details(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_contract_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_employer_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_job_filled(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_payment_proofs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_proof_with_details(uuid) TO authenticated;
