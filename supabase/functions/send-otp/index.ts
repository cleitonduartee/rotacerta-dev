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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { telefone } = await req.json();
    const tel = onlyDigits(telefone);
    if (tel.length < 10 || tel.length > 13) {
      return json({ error: "Telefone inválido" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // gera código de 6 dígitos
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(`${tel}:${code}`);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // invalida códigos anteriores não consumidos
    await supabase.from("phone_otps")
      .update({ consumed: true })
      .eq("telefone", tel).eq("consumed", false);

    const { error } = await supabase.from("phone_otps").insert({
      telefone: tel, code_hash, expires_at,
    });
    if (error) return json({ error: error.message }, 500);

    // MODO DEV: retorna o código no body para a UI exibir.
    // Quando Twilio for conectado, removemos `dev_code` e enviamos via SMS.
    return json({ ok: true, dev_code: code, expires_at });
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
