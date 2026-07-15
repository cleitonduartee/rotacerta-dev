
CREATE TABLE public.maintenances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  tipo_outro TEXT,
  km INTEGER NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenances TO authenticated;
GRANT ALL ON public.maintenances TO service_role;

ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maintenances" ON public.maintenances
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenances" ON public.maintenances
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenances" ON public.maintenances
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenances" ON public.maintenances
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER maintenances_set_updated_at
  BEFORE UPDATE ON public.maintenances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX maintenances_user_truck_idx ON public.maintenances(user_id, truck_id);
CREATE INDEX maintenances_data_idx ON public.maintenances(data DESC);
