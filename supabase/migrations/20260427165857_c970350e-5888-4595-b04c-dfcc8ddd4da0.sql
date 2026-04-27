-- Adiciona colunas em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS recovery_code text;

-- Índices únicos (parciais para permitir nulos)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles (cpf) WHERE cpf IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_recovery_code_unique
  ON public.profiles (recovery_code) WHERE recovery_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telefone_unique
  ON public.profiles (telefone);

-- Tabela para limitar tentativas de recuperação
CREATE TABLE IF NOT EXISTS public.recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL,
  ip text,
  success boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recovery_attempts_cpf_idx
  ON public.recovery_attempts (cpf, created_at DESC);

ALTER TABLE public.recovery_attempts ENABLE ROW LEVEL SECURITY;
-- sem políticas: somente service_role acessa