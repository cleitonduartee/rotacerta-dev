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
    const { telefone, code } = await req.json();
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

    // garante usuário
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list?.users?.find(u => u.email === email);
    if (!user) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { telefone: tel },
      });
      if (cErr) return json({ error: cErr.message }, 500);
      user = created.user!;
      // cria profile
      await admin.from("profiles").insert({ user_id: user.id, telefone: tel });
    } else {
      // garante senha (caso salt mude)
      await admin.auth.admin.updateUserById(user.id, { password });
    }

    // retorna credenciais para o cliente fazer signInWithPassword e ter sessão persistente
    return json({ ok: true, email, password });
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
