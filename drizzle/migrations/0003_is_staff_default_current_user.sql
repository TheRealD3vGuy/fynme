CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$function$;