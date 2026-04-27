create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- explicit deny policies on phone_otps for any role except service_role
revoke all on public.phone_otps from anon, authenticated;