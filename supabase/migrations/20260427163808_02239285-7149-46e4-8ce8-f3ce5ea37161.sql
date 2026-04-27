-- =========================
-- profiles
-- =========================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  telefone text not null,
  nome text,
  cpf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================
-- phone_otps (sem acesso direto via RLS, somente edge functions com service role)
-- =========================
create table public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index phone_otps_tel_idx on public.phone_otps(telefone, created_at desc);
alter table public.phone_otps enable row level security;
-- nenhuma policy => clientes não conseguem ler/escrever, apenas service role

-- =========================
-- helper: trigger updated_at
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================
-- domain tables (todas com user_id + RLS)
-- =========================
create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  placa text not null,
  modelo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.producers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.harvests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null,
  ano int not null,
  fechada boolean not null default false,
  fechada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tipo, ano)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  producer_id uuid not null references public.producers(id) on delete cascade,
  harvest_id uuid not null references public.harvests(id) on delete cascade,
  valor_por_saco numeric(12,2) not null,
  fechado boolean not null default false,
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('safra','frete')),
  data date not null,
  truck_id uuid references public.trucks(id) on delete set null,
  origem text,
  destino text,
  contract_id uuid references public.contracts(id) on delete set null,
  peso_kg numeric(12,2),
  sacos numeric(12,2),
  valor_por_saco_override numeric(12,2),
  transportadora text,
  peso_toneladas numeric(12,2),
  valor_por_tonelada numeric(12,2),
  valor_total numeric(14,2) not null default 0,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  tipo text not null,
  valor numeric(14,2) not null,
  descricao text,
  contract_id uuid references public.contracts(id) on delete set null,
  harvest_id uuid references public.harvests(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
create trigger trucks_uat before update on public.trucks for each row execute function public.set_updated_at();
create trigger producers_uat before update on public.producers for each row execute function public.set_updated_at();
create trigger harvests_uat before update on public.harvests for each row execute function public.set_updated_at();
create trigger contracts_uat before update on public.contracts for each row execute function public.set_updated_at();
create trigger trips_uat before update on public.trips for each row execute function public.set_updated_at();
create trigger expenses_uat before update on public.expenses for each row execute function public.set_updated_at();

-- enable RLS
alter table public.trucks enable row level security;
alter table public.producers enable row level security;
alter table public.harvests enable row level security;
alter table public.contracts enable row level security;
alter table public.trips enable row level security;
alter table public.expenses enable row level security;

-- generic owner-only policies
do $$
declare t text;
begin
  for t in select unnest(array['trucks','producers','harvests','contracts','trips','expenses']) loop
    execute format($f$create policy "%1$s_sel_own" on public.%1$s for select to authenticated using (user_id = auth.uid());$f$, t);
    execute format($f$create policy "%1$s_ins_own" on public.%1$s for insert to authenticated with check (user_id = auth.uid());$f$, t);
    execute format($f$create policy "%1$s_upd_own" on public.%1$s for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
    execute format($f$create policy "%1$s_del_own" on public.%1$s for delete to authenticated using (user_id = auth.uid());$f$, t);
  end loop;
end $$;

-- helpful indexes
create index trips_user_data_idx on public.trips(user_id, data desc);
create index expenses_user_data_idx on public.expenses(user_id, data desc);
create index contracts_user_idx on public.contracts(user_id);
create index harvests_user_idx on public.harvests(user_id);
