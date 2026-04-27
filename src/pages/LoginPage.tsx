import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { maskPhone, maskCPF, onlyDigits, isValidCPF } from '@/lib/masks';
import { toast } from 'sonner';
import { Phone, KeyRound, ArrowLeft, User, IdCard, Mail, ShieldCheck, Copy, Check } from 'lucide-react';

type Step = 'phone' | 'code' | 'signup' | 'recovery';

export default function LoginPage() {
  const { session, profile, profileLoaded, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [tel, setTel] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // signup
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');

  // recovery code shown
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const nav = useNavigate();

  // Se já há sessão ativa ao chegar em /login:
  // - Profile completo → vai pro app
  // - Profile incompleto (cadastro travou) → pula direto para a tela de cadastro
  // IMPORTANTE: não mexer em step se já mostramos o recoveryCode (tela "Guarde seu código")
  useEffect(() => {
    if (!session || !profileLoaded) return;
    if (recoveryCode) return;
    if (profile?.cpf && profile?.nome) {
      nav('/', { replace: true });
    } else if (step === 'phone') {
      setStep('signup');
    }
  }, [session, profile, profileLoaded, step, nav, recoveryCode]);

  async function sendCode(targetTel?: string) {
    const t = onlyDigits(targetTel ?? tel);
    if (t.length < 10) return toast.error('Telefone inválido');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', { body: { telefone: t } });
      if (error) throw error;
      if (data?.dev_code) { setDevCode(data.dev_code); toast.success('Código gerado (modo teste)'); }
      else toast.success('Código enviado por SMS');
      setStep('code');
    } catch (e: any) { toast.error(e.message ?? 'Falha ao enviar código'); }
    finally { setLoading(false); }
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
      const { email, password, needs_signup } = data;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
      if (sErr) throw sErr;
      if (needs_signup) {
        // Não navega — fica em /login para concluir cadastro (Nome, CPF, Email)
        setStep('signup');
        toast.success('Telefone confirmado. Complete seu cadastro.');
      } else {
        toast.success('Bem-vindo de volta!');
        // Atualiza profile em background; navega imediatamente
        refreshProfile();
        nav('/', { replace: true });
      }
    } catch (e: any) { toast.error(e.message ?? 'Falha ao validar'); }
    finally { setLoading(false); }
  }

  async function completeSignup() {
    if (nome.trim().length < 2) return toast.error('Informe seu nome');
    if (!isValidCPF(cpf)) return toast.error('CPF inválido');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error('Email inválido');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-signup', {
        body: { nome: nome.trim(), cpf: onlyDigits(cpf), email: email.trim() || null },
      });
      if (error) throw error;
      setRecoveryCode(data.recovery_code);
      await refreshProfile();
    } catch (e: any) { toast.error(e.message ?? 'Falha no cadastro'); }
    finally { setLoading(false); }
  }

  function copyRecovery() {
    if (!recoveryCode) return;
    navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    toast.success('Código copiado');
    setTimeout(() => setCopied(false), 2000);
  }

  function finishSignup() {
    if (!confirmedSaved) return toast.error('Confirme que guardou o código');
    nav('/', { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 py-10">
      <div className="mb-8 text-center">
        <p className="font-display text-4xl text-primary">ROTACERTA</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Estrada na palma da mão</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
        {step === 'phone' && (
          <>
            <h1 className="mb-2 font-display text-2xl">Entrar</h1>
            <p className="mb-4 text-sm text-muted-foreground">Entre com seu número (sem senha). Enviaremos um código de 6 dígitos.</p>
            <Field icon={<Phone className="h-4 w-4" />} label="Telefone">
              <input
                inputMode="tel" placeholder="(99) 99999-9999" value={tel} maxLength={15}
                onChange={e => setTel(maskPhone(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <button onClick={() => sendCode()} disabled={loading}
              className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
              {loading ? 'Enviando...' : 'Receber código'}
            </button>
            <button onClick={() => setStep('recovery')}
              className="mt-3 w-full rounded-lg border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Troquei meu número
            </button>
          </>
        )}

        {step === 'code' && (
          <>
            <button onClick={() => { setStep('phone'); setCode(''); setDevCode(null); }}
              className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Trocar telefone
            </button>
            <h1 className="mb-2 font-display text-2xl">Código de verificação</h1>
            <p className="mb-4 text-sm text-muted-foreground">Enviamos um código para <span className="font-semibold text-foreground">{tel}</span></p>
            {devCode && <DevCodeBox code={devCode} />}
            <Field icon={<KeyRound className="h-4 w-4" />} label="Código (6 dígitos)">
              <input
                inputMode="numeric" placeholder="000000" value={code} maxLength={6}
                onChange={e => setCode(onlyDigits(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 text-center font-mono text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <button onClick={verify} disabled={loading}
              className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
              {loading ? 'Validando...' : 'Entrar'}
            </button>
            <button onClick={() => sendCode()} disabled={loading}
              className="mt-2 w-full rounded-lg border border-border py-2.5 text-sm font-semibold">Reenviar código</button>
          </>
        )}

        {step === 'signup' && !recoveryCode && (
          <>
            <h1 className="mb-2 font-display text-2xl">Complete seu cadastro</h1>
            <p className="mb-4 text-sm text-muted-foreground">Precisamos desses dados para criar sua conta com segurança.</p>
            <Field icon={<User className="h-4 w-4" />} label="Nome completo">
              <input value={nome} onChange={e => setNome(e.target.value)}
                className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            </Field>
            <div className="mt-3" />
            <Field icon={<IdCard className="h-4 w-4" />} label="CPF">
              <input inputMode="numeric" value={cpf} maxLength={14}
                onChange={e => setCpf(maskCPF(e.target.value))}
                className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            </Field>
            <div className="mt-3" />
            <Field icon={<Mail className="h-4 w-4" />} label="Email (opcional, mas recomendado para recuperação)">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            </Field>
            <button onClick={completeSignup} disabled={loading}
              className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
              {loading ? 'Salvando...' : 'Continuar'}
            </button>
          </>
        )}

        {step === 'signup' && recoveryCode && (
          <>
            <div className="mb-4 flex items-center gap-2 text-primary">
              <ShieldCheck className="h-6 w-6" />
              <h1 className="font-display text-2xl">Guarde seu código</h1>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Este é seu <strong className="text-foreground">código de recuperação</strong>. Ele será necessário se você trocar de número e não tiver email cadastrado. <strong className="text-warning">Anote em local seguro — só será mostrado agora.</strong>
            </p>
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-center">
              <p className="font-mono text-2xl font-bold tracking-widest text-primary">{recoveryCode}</p>
            </div>
            <button onClick={copyRecovery}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-semibold">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar código'}
            </button>
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmedSaved} onChange={e => setConfirmedSaved(e.target.checked)}
                className="mt-0.5 h-4 w-4" />
              <span>Anotei e guardei meu código de recuperação em local seguro.</span>
            </label>
            <button onClick={finishSignup} disabled={!confirmedSaved}
              className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
              Entrar no app
            </button>
          </>
        )}

        {step === 'recovery' && (
          <RecoverFlow onBack={() => setStep('phone')} onDone={() => { setStep('phone'); }} />
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        {children}
      </div>
    </div>
  );
}

function DevCodeBox({ code }: { code: string }) {
  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Modo teste — código:</p>
      <p className="font-mono text-lg font-bold tracking-widest text-primary">{code}</p>
    </div>
  );
}

// ============= Fluxo "troquei meu número" =============
type RStep = 'cpf' | 'challenge' | 'newphone' | 'newotp';

function RecoverFlow({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState<RStep>('cpf');
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState('');
  const [method, setMethod] = useState<'email' | 'recovery_code' | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [emailDevCode, setEmailDevCode] = useState<string | null>(null);
  const [challengeValue, setChallengeValue] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newOtp, setNewOtp] = useState('');
  const [newDevCode, setNewDevCode] = useState<string | null>(null);
  const nav = useNavigate();
  const { refreshProfile } = useAuth();

  async function start() {
    if (!isValidCPF(cpf)) return toast.error('CPF inválido');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recover-start', {
        body: { cpf: onlyDigits(cpf) },
      });
      if (error) throw error;
      setMethod(data.method);
      setMaskedEmail(data.masked_email ?? null);
      setEmailDevCode(data.dev_code ?? null);
      setStep('challenge');
    } catch (e: any) { toast.error(e.message ?? 'Falha ao iniciar recuperação'); }
    finally { setLoading(false); }
  }

  async function sendNewOtp() {
    if (onlyDigits(newTel).length < 10) return toast.error('Telefone inválido');
    if (!challengeValue) return toast.error(method === 'email' ? 'Informe o código do email' : 'Informe o recovery code');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { telefone: onlyDigits(newTel) },
      });
      if (error) throw error;
      setNewDevCode(data?.dev_code ?? null);
      setStep('newotp');
      toast.success('Código enviado para o novo número');
    } catch (e: any) { toast.error(e.message ?? 'Falha'); }
    finally { setLoading(false); }
  }

  async function finish() {
    if (onlyDigits(newOtp).length !== 6) return toast.error('OTP do novo telefone inválido');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recover-finish', {
        body: {
          cpf: onlyDigits(cpf),
          challenge_type: method,
          challenge_value: challengeValue.trim(),
          new_telefone: onlyDigits(newTel),
          otp_code: onlyDigits(newOtp),
        },
      });
      if (error) throw error;
      const { email, password } = data;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
      if (sErr) throw sErr;
      await refreshProfile();
      toast.success('Telefone atualizado. Bem-vindo de volta!');
      nav('/', { replace: true });
      onDone();
    } catch (e: any) { toast.error(e.message ?? 'Falha ao concluir'); }
    finally { setLoading(false); }
  }

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="mb-2 font-display text-2xl">Troquei meu número</h1>

      {step === 'cpf' && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Informe seu CPF para localizarmos sua conta.</p>
          <Field icon={<IdCard className="h-4 w-4" />} label="CPF">
            <input inputMode="numeric" value={cpf} maxLength={14}
              onChange={e => setCpf(maskCPF(e.target.value))}
              className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary" />
          </Field>
          <button onClick={start} disabled={loading}
            className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Verificando...' : 'Continuar'}
          </button>
        </>
      )}

      {step === 'challenge' && (
        <>
          {method === 'email' ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Enviamos um código para <span className="font-semibold text-foreground">{maskedEmail}</span></p>
              {emailDevCode && <DevCodeBox code={emailDevCode} />}
              <Field icon={<KeyRound className="h-4 w-4" />} label="Código do email">
                <input inputMode="numeric" maxLength={6} value={challengeValue}
                  onChange={e => setChallengeValue(onlyDigits(e.target.value))}
                  className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 text-center font-mono text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary" />
              </Field>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Esta conta não tem email. Informe seu <strong className="text-foreground">código de recuperação</strong> (XXXX-XXXX-XXXX-XXXX).</p>
              <Field icon={<ShieldCheck className="h-4 w-4" />} label="Código de recuperação">
                <input value={challengeValue} onChange={e => setChallengeValue(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary" />
              </Field>
            </>
          )}
          <div className="mt-4" />
          <Field icon={<Phone className="h-4 w-4" />} label="Novo telefone">
            <input inputMode="tel" maxLength={15} value={newTel}
              onChange={e => setNewTel(maskPhone(e.target.value))}
              className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary" />
          </Field>
          <button onClick={sendNewOtp} disabled={loading}
            className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar código para novo número'}
          </button>
        </>
      )}

      {step === 'newotp' && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">Enviamos um código para <span className="font-semibold text-foreground">{newTel}</span></p>
          {newDevCode && <DevCodeBox code={newDevCode} />}
          <Field icon={<KeyRound className="h-4 w-4" />} label="Código do novo telefone">
            <input inputMode="numeric" maxLength={6} value={newOtp}
              onChange={e => setNewOtp(onlyDigits(e.target.value))}
              className="w-full rounded-lg border border-border bg-input py-3 pl-9 pr-3 text-center font-mono text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary" />
          </Field>
          <button onClick={finish} disabled={loading}
            className="mt-5 w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Concluindo...' : 'Trocar telefone e entrar'}
          </button>
        </>
      )}
    </>
  );
}
