CREATE TABLE public.advances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id),
  trip_id uuid REFERENCES public.trips(id),
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT advances_one_target CHECK (num_nonnulls(contract_id, trip_id) = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advances TO authenticated;
GRANT ALL ON public.advances TO service_role;

ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY advances_sel_own ON public.advances FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY advances_ins_own ON public.advances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY advances_upd_own ON public.advances FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY advances_del_own ON public.advances FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX advances_user_idx ON public.advances(user_id);
CREATE INDEX advances_contract_idx ON public.advances(contract_id);
CREATE INDEX advances_trip_idx ON public.advances(trip_id);

CREATE TRIGGER advances_uat BEFORE UPDATE ON public.advances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();