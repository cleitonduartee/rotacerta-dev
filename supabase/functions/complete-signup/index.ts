// Cria/atualiza o perfil do usuário autenticado com nome, CPF, email opcional
// e gera recovery_code único. Retorna o recovery_code (mostrado uma única vez).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(s: string) { return (s ?? "").replace(/\D/g, ""); }
function isValidCPF(cpf: string) {
  const s = onlyDigits(cpf);
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(s[i]) * (10 - i);
  let r = (sum * 10) % 11; if (r === 10) r = 0;
  if (r !== parseInt(s[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(s[i]) * (11 - i);
  r = (sum * 10) % 11; if (r === 10) r = 0;
  return r === parseInt(s[10]);
}
function genRecoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0,4)}-${chars.slice(4,8)}-${chars.slice(8,12)}-${chars.slice(12,16)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const user = userData.user;
    const tel = onlyDigits((user.user_metadata as any)?.telefone ?? "");

    const { nome, cpf, email } = await req.json();
    if (!nome || String(nome).trim().length < 2) return json({ error: "Informe o nome" }, 400);
    const cpfDigits = onlyDigits(cpf ?? "");
    if (!isValidCPF(cpfDigits)) return json({ error: "CPF inválido" }, 400);
    const emailClean = email ? String(email).trim().toLowerCase() : null;
    if (emailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return json({ error: "Email inválido" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // CPF deve ser único entre usuários
    const { data: cpfTaken } = await admin
      .from("profiles").select("user_id").eq("cpf", cpfDigits).neq("user_id", user.id).maybeSingle();
    if (cpfTaken) return json({ error: "CPF já cadastrado em outra conta" }, 400);

    const recovery_code = genRecoveryCode();

    // upsert perfil (telefone vem do user_metadata)
    const { error: upErr } = await admin.from("profiles").upsert({
      user_id: user.id,
      telefone: tel,
      nome: String(nome).trim(),
      cpf: cpfDigits,
      email: emailClean,
      recovery_code,
    }, { onConflict: "user_id" });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, recovery_code });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
