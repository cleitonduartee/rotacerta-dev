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

// Gera recovery_code legível: 4 grupos de 4 (XXXX-XXXX-XXXX-XXXX)
function genRecoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0,4)}-${chars.slice(4,8)}-${chars.slice(8,12)}-${chars.slice(12,16)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { telefone, code } = body;
    const tel = onlyDigits(telefone);
    const c = onlyDigits(code);
    if (!tel || c.length !== 6) return json({ error: "Dados inválidos" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: otps, error: selErr } = await admin
      .from("phone_otps")
      .select("*")
      .eq("telefone", tel)
      .eq("consumed", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (selErr) return json({ error: selErr.message }, 500);
    const otp = otps?.[0];
    if (!otp) return json({ error: "Código não encontrado. Solicite um novo." }, 400);
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return json({ error: "Código expirado." }, 400);
    }
    if (otp.attempts >= 5) {
      return json({ error: "Muitas tentativas. Solicite um novo código." }, 400);
    }

    const code_hash = await sha256(`${tel}:${c}`);
    if (code_hash !== otp.code_hash) {
      await admin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return json({ error: "Código incorreto." }, 400);
    }

    await admin.from("phone_otps").update({ consumed: true }).eq("id", otp.id);

    const email = fakeEmailFor(tel);
    const password = await passwordFor(tel);

    // Já existe perfil para esse telefone?
    const { data: existingProfile } = await admin
      .from("profiles").select("user_id").eq("telefone", tel).maybeSingle();

    let needs_signup = false;
    let user_id: string | null = null;

    if (existingProfile?.user_id) {
      // Profile existente: garante que email/senha do auth estão alinhados com o telefone.
      user_id = existingProfile.user_id;

      // Antes de atualizar, limpa qualquer auth.user órfão (sem profile) que já tenha esse email,
      // para evitar conflito do unique key users_email_partial_key.
      try {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const orphans = (list?.users ?? []).filter(
          (u) => u.email === email && u.id !== user_id,
        );
        for (const u of orphans) {
          // só remove se realmente não tem profile vinculado
          const { data: p } = await admin.from("profiles")
            .select("user_id").eq("user_id", u.id).maybeSingle();
          if (!p) await admin.auth.admin.deleteUser(u.id);
        }
      } catch (e) {
        console.warn("cleanup orphan auth users falhou", e);
      }

      const { error: uErr } = await admin.auth.admin.updateUserById(user_id, {
        email, password, email_confirm: true, user_metadata: { telefone: tel },
      });
      if (uErr) return json({ error: uErr.message }, 500);
    } else {
      // Não há profile para esse telefone → é cadastro novo.
      // Antes, limpa qualquer auth.user órfão (sem profile) com o mesmo email-alvo,
      // resíduo de tentativas anteriores que falharam no meio.
      try {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const sameEmail = (list?.users ?? []).filter((u) => u.email === email);
        for (const u of sameEmail) {
          const { data: p } = await admin.from("profiles")
            .select("user_id").eq("user_id", u.id).maybeSingle();
          if (!p) await admin.auth.admin.deleteUser(u.id);
        }
      } catch (e) {
        console.warn("cleanup orphan auth users (signup) falhou", e);
      }

      // Tenta criar; se ainda assim houver conflito (ex: usuário com profile real),
      // significa que esse email está realmente em uso → erro claro.
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { telefone: tel },
      });
      if (cErr) return json({ error: cErr.message }, 500);
      user_id = created.user!.id;
      needs_signup = true;
    }

    return json({ ok: true, email, password, needs_signup, user_id });
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
