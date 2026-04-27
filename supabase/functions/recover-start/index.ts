// Inicia recuperação de conta: localiza por CPF e envia desafio
// (email com código OU pede recovery_code). Limita a 3 tentativas/hora.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(s: string) { return (s ?? "").replace(/\D/g, ""); }
async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!d) return e;
  const head = u.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { cpf } = await req.json();
    const cpfDigits = onlyDigits(cpf ?? "");
    if (cpfDigits.length !== 11) return json({ error: "CPF inválido" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // rate limit: 3 tentativas/hora por CPF
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("recovery_attempts")
      .select("id", { count: "exact", head: true })
      .eq("cpf", cpfDigits).gte("created_at", since);
    if ((count ?? 0) >= 3) {
      await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: false, reason: "rate_limited" });
      return json({ error: "Muitas tentativas. Tente novamente em 1 hora." }, 429);
    }

    const { data: profile } = await admin.from("profiles")
      .select("user_id, email, telefone").eq("cpf", cpfDigits).maybeSingle();

    if (!profile) {
      await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: false, reason: "not_found" });
      return json({ error: "Conta não encontrada para este CPF" }, 404);
    }

    if (profile.email) {
      // gera código de email (modo dev: retorna na resposta)
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await sha256(`recover:${profile.user_id}:${code}`);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      // reutiliza phone_otps com prefixo "recover-"
      await admin.from("phone_otps").update({ consumed: true })
        .eq("telefone", `recover-${profile.user_id}`).eq("consumed", false);
      await admin.from("phone_otps").insert({
        telefone: `recover-${profile.user_id}`, code_hash, expires_at,
      });
      return json({
        ok: true, method: "email", masked_email: maskEmail(profile.email),
        dev_code: code, // modo dev
      });
    }

    return json({ ok: true, method: "recovery_code" });
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
