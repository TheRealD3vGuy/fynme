CREATE TABLE public.event_rsvps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.private_events(id) ON DELETE CASCADE,
 session_hash text NOT NULL REFERENCES public.event_guest_sessions(token_hash) ON DELETE CASCADE,
 guest_name text NOT NULL CHECK (length(guest_name) BETWEEN 1 AND 160), response text NOT NULL CHECK (response IN ('yes','maybe','no')),
 party_size integer NOT NULL DEFAULT 1 CHECK (party_size BETWEEN 1 AND 20), dietary_requirements text NOT NULL DEFAULT '' CHECK(length(dietary_requirements)<=3000), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=5000),
 consent boolean NOT NULL CHECK(consent), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(event_id,session_hash)
);
GRANT SELECT ON public.event_rsvps TO authenticated;
GRANT ALL ON public.event_rsvps TO service_role;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY rsvp_staff_read ON public.event_rsvps FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE TABLE public.event_planning_summaries (
 event_id uuid PRIMARY KEY REFERENCES public.private_events(id) ON DELETE CASCADE, summary text NOT NULL DEFAULT '', source_fingerprint text NOT NULL DEFAULT '', generated_at timestamptz, ai_block_reason text NOT NULL DEFAULT '', ai_block_status integer
);
GRANT SELECT, INSERT, UPDATE ON public.event_planning_summaries TO authenticated;
GRANT ALL ON public.event_planning_summaries TO service_role;
ALTER TABLE public.event_planning_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY planning_staff_read ON public.event_planning_summaries FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE POLICY planning_staff_insert ON public.event_planning_summaries FOR INSERT TO authenticated WITH CHECK(public.is_staff(auth.uid()));
CREATE POLICY planning_staff_update ON public.event_planning_summaries FOR UPDATE TO authenticated USING(public.is_staff(auth.uid())) WITH CHECK(public.is_staff(auth.uid()));
CREATE FUNCTION public.guest_rsvp(session_hash text, payload jsonb DEFAULT NULL) RETURNS SETOF public.event_rsvps LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ev uuid;
BEGIN
 SELECT e.id INTO ev FROM public.private_events e JOIN public.event_guest_sessions s ON s.event_id=e.id WHERE s.token_hash=session_hash AND s.access_version=e.access_version AND e.is_published AND NOT e.is_locked AND e.ends_at>now() FOR UPDATE OF e;
 IF ev IS NULL THEN RAISE EXCEPTION 'Invitation no longer active' USING ERRCODE='42501'; END IF;
 IF payload IS NOT NULL THEN
 INSERT INTO public.event_rsvps(event_id,session_hash,guest_name,response,party_size,dietary_requirements,notes,consent)
 VALUES(ev,session_hash,trim(payload->>'guest_name'),payload->>'response',(payload->>'party_size')::integer,coalesce(payload->>'dietary_requirements',''),coalesce(payload->>'notes',''),(payload->>'consent')::boolean)
 ON CONFLICT(event_id,session_hash) DO UPDATE SET guest_name=EXCLUDED.guest_name,response=EXCLUDED.response,party_size=EXCLUDED.party_size,dietary_requirements=EXCLUDED.dietary_requirements,notes=EXCLUDED.notes,consent=EXCLUDED.consent,updated_at=now();
 END IF;
 RETURN QUERY SELECT r.* FROM public.event_rsvps r WHERE r.event_id=ev AND r.session_hash=guest_rsvp.session_hash;
END $$;
REVOKE ALL ON FUNCTION public.guest_rsvp(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_rsvp(text,jsonb) TO service_role;