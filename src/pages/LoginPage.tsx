import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { maskPhone, onlyDigits } from '@/lib/masks';
import { toast } from 'sonner';
import { Phone, KeyRound, ArrowLeft } from 'lucide-react';

type Step = 'phone' | 'code';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone');
  const [tel, setTel] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function sendCode() {
    const t = onlyDigits(tel);
    if (t.length < 10) return toast.error('Telefone inválido');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { telefone: t },
      });
      if (error) throw error;
      if (data?.dev_code) {
        setDevCode(data.dev_code);
        toast.success('Código gerado (modo teste)');
      } else {
        toast.success('Código enviado por SMS');
      }
      setStep('code');
    } catch (e: any) {
      toast.error(e.message ?? 'Falha ao enviar código');
    } finally { setLoading(false); }
  }

  async function verify() {
    const t = onlyDigits(tel);
    const c = onlyDigits(code);
    if (c.length !== 6) return toast.error('Informe os 6 dígitos');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { telefone: t, code: c },
      });
      if (error) throw error;
      const { email, password } = data;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
      if (sErr) throw sErr;
      toast.success('Bem-vindo!');
      nav('/', { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? 'Falha ao validar');
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 py-10">
      <div className="mb-8 text-center">
        <p className="font-display text-4xl text-primary">ROTACERTA</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          Estrada na palma da mão
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
        {step === 'phone' ? (
          <>
            <h1 className="mb-2 font-display text-2xl">Entrar</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Informe seu telefone. Enviaremos um código de 6 dígitos.
            </p>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Telefone
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                inputMode="tel"
                placeholder="(99) 99999-9999"
                value={tel}
                maxLength={15}
                onChange={e => setTel(maskPhone(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={sendCode}
              disabled={loading}
              className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Receber código'}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setStep('phone'); setCode(''); setDevCode(null); }} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Trocar telefone
            </button>
            <h1 className="mb-2 font-display text-2xl">Código de verificação</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Enviado para <span className="font-semibold text-foreground">{tel}</span>
            </p>
            {devCode && (
              <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Modo teste — código:</p>
                <p className="font-mono text-lg font-bold tracking-widest text-primary">{devCode}</p>
              </div>
            )}
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Código (6 dígitos)
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                inputMode="numeric"
                placeholder="000000"
                value={code}
                maxLength={6}
                onChange={e => setCode(onlyDigits(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 text-center font-mono text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={verify}
              disabled={loading}
              className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Validando...' : 'Entrar'}
            </button>
            <button
              onClick={sendCode}
              disabled={loading}
              className="mt-2 w-full rounded-lg border border-border py-2.5 text-sm font-semibold"
            >
              Reenviar código
            </button>
          </>
        )}
      </div>
    </div>
  );
}
