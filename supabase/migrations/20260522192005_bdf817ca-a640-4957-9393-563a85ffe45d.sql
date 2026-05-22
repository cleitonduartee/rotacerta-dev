ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pix_tipo text,
  ADD COLUMN IF NOT EXISTS pix_chave text,
  ADD COLUMN IF NOT EXISTS pix_beneficiario text,
  ADD COLUMN IF NOT EXISTS pix_cidade text,
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS agencia text,
  ADD COLUMN IF NOT EXISTS conta text;