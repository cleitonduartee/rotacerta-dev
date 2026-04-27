-- Remove o usuário auth órfão criado por tentativa anterior (sem profile)
DELETE FROM auth.users WHERE id = 'c44a2a77-f510-4182-affd-f58f770bb419';