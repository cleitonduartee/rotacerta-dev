// Finaliza recuperação: valida desafio (email code OU recovery_code) + OTP do novo telefone,
// atualiza telefone do perfil e e-mail interno do usuário, retorna credenciais para login.
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
function fakeEmailFor(tel: string) { return `tel-${tel}@rotacerta.local`; }
async function passwordFor(tel: string) {
  const secret = Deno.env.get("OTP_PASSWORD_SALT") ?? "rotacerta-default-salt";
  return await sha256(`${secret}:${tel}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { cpf, challenge_type, challenge_value, new_telefone, otp_code } = await req.json();
    const cpfDigits = onlyDigits(cpf ?? "");
    const newTel = onlyDigits(new_telefone ?? "");
    const otp = onlyDigits(otp_code ?? "");
    if (cpfDigits.length !== 11) return json({ error: "CPF inválido" }, 400);
    if (newTel.length < 10) return json({ error: "Novo telefone inválido" }, 400);
    if (otp.length !== 6) return json({ error: "OTP inválido" }, 400);
    if (!["email", "recovery_code"].includes(challenge_type)) return json({ error: "Tipo de validação inválido" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // rate limit
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("recovery_attempts")
      .select("id", { count: "exact", head: true })
      .eq("cpf", cpfDigits).gte("created_at", since);
    if ((count ?? 0) >= 5) {
      return json({ error: "Muitas tentativas. Tente novamente em 1 hora." }, 429);
    }

    const { data: profile } = await admin.from("profiles")
      .select("user_id, email, recovery_code").eq("cpf", cpfDigits).maybeSingle();
    if (!profile) {
      await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: false, reason: "not_found" });
      return json({ error: "Conta não encontrada" }, 404);
    }

    // valida desafio
    if (challenge_type === "recovery_code") {
      if (!profile.recovery_code || String(challenge_value).trim().toUpperCase() !== profile.recovery_code) {
        await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: false, reason: "bad_recovery_code" });
        return json({ error: "Código de recuperação incorreto" }, 400);
      }
    } else {
      const c = onlyDigits(challenge_value ?? "");
      if (c.length !== 6) return json({ error: "Código de email inválido" }, 400);
      const code_hash = await sha256(`recover:${profile.user_id}:${c}`);
      const { data: rows } = await admin.from("phone_otps")
        .select("*").eq("telefone", `recover-${profile.user_id}`)
        .eq("consumed", false).order("created_at", { ascending: false }).limit(1);
      const row = rows?.[0];
      if (!row || row.code_hash !== code_hash || new Date(row.expires_at).getTime() < Date.now()) {
        await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: false, reason: "bad_email_code" });
        return json({ error: "Código de email incorreto ou expirado" }, 400);
      }
      await admin.from("phone_otps").update({ consumed: true }).eq("id", row.id);
    }

    // valida OTP do NOVO telefone
    const otpHash = await sha256(`${newTel}:${otp}`);
    const { data: otpRows } = await admin.from("phone_otps")
      .select("*").eq("telefone", newTel).eq("consumed", false)
      .order("created_at", { ascending: false }).limit(1);
    const otpRow = otpRows?.[0];
    if (!otpRow || otpRow.code_hash !== otpHash || new Date(otpRow.expires_at).getTime() < Date.now()) {
      await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: false, reason: "bad_new_otp" });
      return json({ error: "Código do novo telefone incorreto ou expirado" }, 400);
    }
    await admin.from("phone_otps").update({ consumed: true }).eq("id", otpRow.id);

    // garante que o novo telefone não pertence a outra conta
    const { data: clash } = await admin.from("profiles")
      .select("user_id").eq("telefone", newTel).neq("user_id", profile.user_id).maybeSingle();
    if (clash) {
      await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: false, reason: "phone_in_use" });
      return json({ error: "Esse telefone já está em uso por outra conta" }, 400);
    }

    // atualiza telefone do perfil + email/senha do usuário
    const newEmail = fakeEmailFor(newTel);
    const newPwd = await passwordFor(newTel);

    // Limpa qualquer usuário órfão no auth com o mesmo email-alvo (evita conflito de unique key).
    // Lista paginada e remove quem não for o próprio user.
    try {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const orphans = (list?.users ?? []).filter(
        (u) => u.email === newEmail && u.id !== profile.user_id,
      );
      for (const u of orphans) {
        await admin.auth.admin.deleteUser(u.id);
        // remove perfil residual desse user_id, se houver
        await admin.from("profiles").delete().eq("user_id", u.id);
      }
    } catch (cleanupErr) {
      console.warn("cleanup orphan auth user falhou", cleanupErr);
    }

    const { error: updErr } = await admin.from("profiles")
      .update({ telefone: newTel }).eq("user_id", profile.user_id);
    if (updErr) return json({ error: updErr.message }, 500);

    const { error: aErr } = await admin.auth.admin.updateUserById(profile.user_id, {
      email: newEmail, password: newPwd, user_metadata: { telefone: newTel },
    });
    if (aErr) return json({ error: aErr.message }, 500);

    await admin.from("recovery_attempts").insert({ cpf: cpfDigits, success: true });

    return json({ ok: true, email: newEmail, password: newPwd });
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
