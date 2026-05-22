import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, deleteWithTombstone } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { useState, useEffect } from 'react';
import { Plus, Trash2, User, Truck as TruckIcon, Wheat, Pencil, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  maskCpfCnpj,
  maskCPF,
  maskCNPJ,
  maskPhone,
  isValidCpfCnpj,
  onlyDigits,
} from '@/lib/masks';

import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { BlockedDeleteDialog } from '@/components/BlockedDeleteDialog';

type DelTarget =
  | { kind: 'truck'; id: number; placa: string }
  | { kind: 'producer'; id: number; nome: string }
  | { kind: 'harvest'; id: number; nome: string };

export default function CadastrosPage() {
  const driver = useLiveQuery(() => db.drivers.toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const [del, setDel] = useState<DelTarget | null>(null);
  const [blocked, setBlocked] = useState<{ title: string; message: React.ReactNode } | null>(null);

  function tryDelete(target: DelTarget) {
    if (target.kind === 'truck') {
      const n = trips.filter(t => t.truckId === target.id).length;
      if (n > 0) {
        return setBlocked({
          title: 'Não é possível excluir o caminhão',
          message: <>O caminhão <strong>{target.placa}</strong> possui <strong>{n}</strong> {n === 1 ? 'viagem vinculada' : 'viagens vinculadas'}. Exclua as viagens antes de remover o caminhão.</>,
        });
      }
    } else if (target.kind === 'producer') {
      const n = contracts.filter(c => c.producerId === target.id).length;
      if (n > 0) {
        return setBlocked({
          title: 'Não é possível excluir o produtor',
          message: <>O produtor <strong>{target.nome}</strong> possui <strong>{n}</strong> {n === 1 ? 'contrato vinculado' : 'contratos vinculados'}. Exclua os contratos antes de remover o produtor.</>,
        });
      }
    } else if (target.kind === 'harvest') {
      const n = contracts.filter(c => c.harvestId === target.id).length;
      if (n > 0) {
        return setBlocked({
          title: 'Não é possível excluir a safra',
          message: <>A safra <strong>{target.nome}</strong> possui <strong>{n}</strong> {n === 1 ? 'contrato vinculado' : 'contratos vinculados'}. Exclua os contratos antes de remover a safra.</>,
        });
      }
    }
    setDel(target);
  }

  async function confirmDelete() {
    if (!del) return;
    if (del.kind === 'truck') await deleteWithTombstone('trucks', del.id);
    else if (del.kind === 'producer') await deleteWithTombstone('producers', del.id);
    else if (del.kind === 'harvest') await deleteWithTombstone('harvests', del.id);
    toast.success('Excluído');
    setDel(null);
  }

  const dialogText = (() => {
    if (!del) return null;
    if (del.kind === 'truck')
      return <>Esta ação não pode ser desfeita. O caminhão <strong>{del.placa}</strong> será removido.</>;
    if (del.kind === 'producer')
      return <>Esta ação não pode ser desfeita. O produtor <strong>{del.nome}</strong> será removido.</>;
    return <>Esta ação não pode ser desfeita. A safra <strong>{del.nome}</strong> será removida.</>;
  })();

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cadastros" subtitle="Motorista, caminhões, produtores e safras" />
      <div className="space-y-6 px-4 pb-6 md:px-6">
        <DriverSection driver={driver[0]} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Section title="Caminhões" icon={TruckIcon}>
          <AddTruck />
          <ul className="space-y-2 mt-3">
            {trucks.map(t => (
              <Row key={t.id} title={t.placa} sub={t.modelo} onDel={() => tryDelete({ kind: 'truck', id: t.id!, placa: t.placa })} />
            ))}
            {trucks.length === 0 && <Empty>Cadastre seu primeiro caminhão.</Empty>}
          </ul>
        </Section>

        <Section title="Produtores" icon={Wheat}>
          <AddProducer />
          <ul className="space-y-2 mt-3">
            {producers.map(p => (
              <Row key={p.id} title={p.nome} onDel={() => tryDelete({ kind: 'producer', id: p.id!, nome: p.nome })} />
            ))}
            {producers.length === 0 && <Empty>Cadastre o primeiro produtor.</Empty>}
          </ul>
        </Section>

        <Section title="Safras" icon={Wheat}>
          <p className="mb-2 text-xs text-muted-foreground">
            A safra serve para identificar o período (ex.: Safra 2026 — Soja). Os contratos e o faturamento ficam em <Link to="/contratos" className="font-semibold text-primary">Contratos</Link>.
          </p>
          <AddHarvest />
          <ul className="space-y-2 mt-3">
            {harvests.map(h => (
              <li key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-2.5">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{h.nome}</p>
                  <p className="text-xs text-muted-foreground">{h.tipo} • {h.ano}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => tryDelete({ kind: 'harvest', id: h.id!, nome: h.nome })}
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
            {harvests.length === 0 && <Empty>Cadastre sua primeira safra.</Empty>}
          </ul>
        </Section>
        </div>

      </div>

      <ConfirmDeleteDialog
        open={!!del}
        onOpenChange={(open) => !open && setDel(null)}
        title={
          del?.kind === 'truck' ? 'Excluir caminhão?'
          : del?.kind === 'producer' ? 'Excluir produtor?'
          : 'Excluir safra?'
        }
        description={dialogText}
        onConfirm={confirmDelete}
      />

      <BlockedDeleteDialog
        open={!!blocked}
        onOpenChange={(open) => !open && setBlocked(null)}
        title={blocked?.title}
        description={blocked?.message}
      />
    </div>
  );
}

type PixTipo = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

function maskPixChave(tipo: PixTipo, v: string): string {
  if (tipo === 'cpf') return maskCPF(v);
  if (tipo === 'cnpj') return maskCNPJ(v);
  if (tipo === 'telefone') return maskPhone(v);
  return v;
}

function isValidPix(tipo: PixTipo, v: string): boolean {
  const s = (v || '').trim();
  if (!s) return false;
  if (tipo === 'cpf' || tipo === 'cnpj') return isValidCpfCnpj(s);
  if (tipo === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  if (tipo === 'telefone') return onlyDigits(s).length >= 10;
  // aleatoria — UUID v4-ish
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function DriverSection({ driver }: { driver?: any }) {
  const { profile, user, refreshProfile } = useAuth();
  const [nome, setNome] = useState('');
  const [docType, setDocType] = useState<'cpf' | 'cnpj'>('cpf');
  const [doc, setDoc] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  // PIX
  const [pixTipo, setPixTipo] = useState<PixTipo>('cpf');
  const [pixChave, setPixChave] = useState('');
  const [pixBeneficiario, setPixBeneficiario] = useState('');
  const [pixCidade, setPixCidade] = useState('');
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [editing, setEditing] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Seed automático do registro local com dados do profile (Cloud) na primeira vez
  useEffect(() => {
    if (seeded) return;
    if (driver) { setSeeded(true); return; }
    if (!profile) return;
    setSeeded(true);
    const cpfDigits = onlyDigits(profile.cpf ?? '');
    const hasAny = profile.nome || cpfDigits || profile.telefone || profile.email || (profile as any).pix_chave;
    if (!hasAny) return;
    db.drivers.add({
      nome: profile.nome ?? '',
      docType: 'cpf',
      cpf: cpfDigits ? maskCPF(cpfDigits) : '',
      telefone: profile.telefone ? maskPhone(profile.telefone) : '',
      email: profile.email ?? '',
      pixTipo: ((profile as any).pix_tipo as PixTipo) ?? undefined,
      pixChave: (profile as any).pix_chave ?? undefined,
      pixBeneficiario: (profile as any).pix_beneficiario ?? undefined,
      pixCidade: (profile as any).pix_cidade ?? undefined,
      banco: (profile as any).banco ?? undefined,
      agencia: (profile as any).agencia ?? undefined,
      conta: (profile as any).conta ?? undefined,
    });
  }, [profile, driver, seeded]);

  useEffect(() => {
    if (driver) {
      setNome(driver.nome);
      const dt = driver.docType ?? (onlyDigits(driver.cpf ?? '').length > 11 ? 'cnpj' : 'cpf');
      setDocType(dt);
      setDoc(dt === 'cpf' ? maskCPF(driver.cpf ?? '') : maskCNPJ(driver.cpf ?? ''));
      setTel(maskPhone(driver.telefone ?? ''));
      setEmail(driver.email ?? '');
      const pt: PixTipo = driver.pixTipo ?? 'cpf';
      setPixTipo(pt);
      setPixChave(driver.pixChave ? maskPixChave(pt, driver.pixChave) : '');
      setPixBeneficiario(driver.pixBeneficiario ?? '');
      setPixCidade(driver.pixCidade ?? '');
      setBanco(driver.banco ?? '');
      setAgencia(driver.agencia ?? '');
      setConta(driver.conta ?? '');
      setEditing(false);
    } else {
      if (profile) {
        const cpfDigits = onlyDigits(profile.cpf ?? '');
        setNome(profile.nome ?? '');
        setDocType('cpf');
        setDoc(cpfDigits ? maskCPF(cpfDigits) : '');
        setTel(profile.telefone ? maskPhone(profile.telefone) : '');
        setEmail(profile.email ?? '');
      }
      setEditing(true);
    }
  }, [driver, profile]);

  const docValid = !doc || isValidCpfCnpj(doc);
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pixValid = !pixChave || isValidPix(pixTipo, pixChave);
  const canSave = editing && Boolean(nome) && docValid && emailValid && pixValid;

  async function save() {
    if (!nome) return toast.error('Informe seu nome');
    if (doc && !isValidCpfCnpj(doc)) {
      return toast.error(docType === 'cpf' ? 'CPF inválido' : 'CNPJ inválido');
    }
    if (email && !emailValid) return toast.error('Email inválido');
    if (pixChave && !pixValid) return toast.error('Chave PIX inválida');

    const payload: any = {
      nome, docType, cpf: doc, telefone: tel, email: email.trim(),
      pixTipo: pixChave ? pixTipo : undefined,
      pixChave: pixChave || undefined,
      pixBeneficiario: pixBeneficiario.trim() || nome.trim() || undefined,
      pixCidade: pixCidade.trim() || undefined,
      banco: banco.trim() || undefined,
      agencia: agencia.trim() || undefined,
      conta: conta.trim() || undefined,
    };
    if (driver) await db.drivers.update(driver.id, payload);
    else await db.drivers.add(payload);

    if (user) {
      const cloudPayload: any = {
        nome: nome.trim() || null,
        telefone: onlyDigits(tel) || null,
        email: email.trim() ? email.trim().toLowerCase() : null,
        pix_tipo: pixChave ? pixTipo : null,
        pix_chave: pixChave || null,
        pix_beneficiario: pixBeneficiario.trim() || nome.trim() || null,
        pix_cidade: pixCidade.trim() || null,
        banco: banco.trim() || null,
        agencia: agencia.trim() || null,
        conta: conta.trim() || null,
      };
      if (docType === 'cpf' && doc) cloudPayload.cpf = onlyDigits(doc);

      try {
        const { error: upErr } = await supabase
          .from('profiles')
          .update(cloudPayload)
          .eq('user_id', user.id);
        if (upErr) {
          const msg = /duplicate|unique/i.test(upErr.message)
            ? 'Este CPF já está vinculado a outra conta'
            : 'Salvo localmente, mas houve erro ao sincronizar com a nuvem';
          toast.warning(msg);
        } else {
          await refreshProfile();
        }
      } catch (e) { /* offline → mantém local; sincroniza depois */ }
    }

    setEditing(false);
    toast.success('Dados salvos');
  }

  function onDocChange(v: string) {
    setDoc(docType === 'cpf' ? maskCPF(v) : maskCNPJ(v));
  }
  function switchDocType(t: 'cpf' | 'cnpj') {
    setDocType(t);
    setDoc(t === 'cpf' ? maskCPF(doc) : maskCNPJ(doc));
  }
  function switchPixTipo(t: PixTipo) {
    setPixTipo(t);
    setPixChave(maskPixChave(t, pixChave));
  }

  function cancel() {
    if (driver) {
      const dt = driver.docType ?? (onlyDigits(driver.cpf ?? '').length > 11 ? 'cnpj' : 'cpf');
      setNome(driver.nome);
      setDocType(dt);
      setDoc(dt === 'cpf' ? maskCPF(driver.cpf ?? '') : maskCNPJ(driver.cpf ?? ''));
      setTel(maskPhone(driver.telefone ?? ''));
      setEmail(driver.email ?? '');
      const pt: PixTipo = driver.pixTipo ?? 'cpf';
      setPixTipo(pt);
      setPixChave(driver.pixChave ? maskPixChave(pt, driver.pixChave) : '');
      setPixBeneficiario(driver.pixBeneficiario ?? '');
      setPixCidade(driver.pixCidade ?? '');
      setBanco(driver.banco ?? '');
      setAgencia(driver.agencia ?? '');
      setConta(driver.conta ?? '');
      setEditing(false);
    }
  }

  const pixTipoLabel: Record<PixTipo, string> = {
    cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Aleatória',
  };

  // Modo visualização
  if (driver && !editing) {
    return (
      <Section title="Seus dados" icon={User}>
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
          <InfoRow label="Nome" value={driver.nome} />
          <InfoRow label={(driver.docType ?? 'cpf').toUpperCase()} value={driver.cpf || '—'} />
          <InfoRow label="Telefone" value={driver.telefone || '—'} />
          <InfoRow label="Email" value={driver.email || '—'} />
        </div>

        <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Recebimento (PIX)</p>
          {driver.pixChave ? (
            <div className="space-y-2">
              <InfoRow label={`PIX (${pixTipoLabel[(driver.pixTipo as PixTipo) ?? 'cpf']})`} value={driver.pixChave} />
              <InfoRow label="Beneficiário" value={driver.pixBeneficiario || driver.nome || '—'} />
              <InfoRow label="Cidade" value={driver.pixCidade || '—'} />
              {driver.banco && <InfoRow label="Banco" value={driver.banco} />}
              {(driver.agencia || driver.conta) && (
                <InfoRow label="Ag / Conta" value={`${driver.agencia || '—'} / ${driver.conta || '—'}`} />
              )}
              <p className="flex items-start gap-1.5 pt-1 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" />
                <span>Estes dados aparecem com QR Code no PDF de fechamento enviado ao produtor.</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem chave PIX cadastrada. Edite para gerar QR Code no relatório de fechamento.
            </p>
          )}
        </div>

        <button
          onClick={() => setEditing(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-2.5 font-bold text-primary hover:bg-primary/20"
        >
          <Pencil className="h-4 w-4" /> Editar
        </button>
      </Section>
    );
  }

  const fieldCls = inputCls + ' disabled:opacity-60 disabled:cursor-not-allowed';
  const pixPlaceholder: Record<PixTipo, string> = {
    cpf: '999.999.999-99',
    cnpj: '99.999.999/9999-99',
    email: 'email@exemplo.com',
    telefone: '(99) 99999-9999',
    aleatoria: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  };

  return (
    <Section title="Seus dados" icon={User}>
      <div className="space-y-2 mt-2">
        <input className={fieldCls} placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} disabled={!editing} />

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-input p-1 text-xs font-bold">
          {(['cpf', 'cnpj'] as const).map(t => (
            <button key={t} type="button" onClick={() => switchDocType(t)} disabled={!editing}
              className={'rounded-md py-1.5 disabled:opacity-60 ' + (docType === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <input
          className={fieldCls}
          inputMode="numeric"
          placeholder={docType === 'cpf' ? '999.999.999-99' : '99.999.999/9999-99'}
          value={doc}
          onChange={e => onDocChange(e.target.value)}
          maxLength={docType === 'cpf' ? 14 : 18}
          disabled={!editing}
        />
        {doc && !isValidCpfCnpj(doc) && (
          <p className="text-xs text-destructive">{docType === 'cpf' ? 'CPF inválido' : 'CNPJ inválido'}</p>
        )}

        <input
          className={fieldCls}
          inputMode="tel"
          placeholder="(99) 99999-9999"
          value={tel}
          onChange={e => setTel(maskPhone(e.target.value))}
          maxLength={15}
          disabled={!editing}
        />

        <div className="space-y-1">
          <input
            className={fieldCls}
            type="email"
            inputMode="email"
            placeholder="email@exemplo.com (opcional)"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={!editing}
          />
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" />
            <span>O email é <strong>opcional</strong>, mas será <strong>essencial</strong> para recuperar sua conta caso você troque de número no futuro.</span>
          </p>
          {email && !emailValid && (
            <p className="text-xs text-destructive">Email inválido</p>
          )}
        </div>

        {/* ============ PIX ============ */}
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Recebimento (PIX)</p>
          <p className="text-[11px] text-muted-foreground">
            Aparece como QR Code no PDF de fechamento. Opcional — deixe em branco se não quiser.
          </p>

          <div className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-input p-1 text-[11px] font-bold">
            {(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'] as const).map(t => (
              <button key={t} type="button" onClick={() => switchPixTipo(t)} disabled={!editing}
                className={'rounded-md py-1.5 disabled:opacity-60 ' + (pixTipo === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {pixTipoLabel[t]}
              </button>
            ))}
          </div>

          <input
            className={fieldCls}
            placeholder={pixPlaceholder[pixTipo]}
            value={pixChave}
            onChange={e => setPixChave(maskPixChave(pixTipo, e.target.value))}
            disabled={!editing}
          />
          {pixChave && !pixValid && (
            <p className="text-xs text-destructive">Chave PIX inválida para o tipo selecionado</p>
          )}

          <input
            className={fieldCls}
            placeholder="Nome do beneficiário (até 25 caracteres)"
            value={pixBeneficiario}
            onChange={e => setPixBeneficiario(e.target.value)}
            maxLength={25}
            disabled={!editing}
          />
          <input
            className={fieldCls}
            placeholder="Cidade do beneficiário (até 15 caracteres)"
            value={pixCidade}
            onChange={e => setPixCidade(e.target.value)}
            maxLength={15}
            disabled={!editing}
          />

          <div className="grid grid-cols-3 gap-2">
            <input
              className={fieldCls}
              placeholder="Banco"
              value={banco}
              onChange={e => setBanco(e.target.value)}
              disabled={!editing}
            />
            <input
              className={fieldCls}
              placeholder="Agência"
              value={agencia}
              onChange={e => setAgencia(e.target.value)}
              disabled={!editing}
            />
            <input
              className={fieldCls}
              placeholder="Conta"
              value={conta}
              onChange={e => setConta(e.target.value)}
              disabled={!editing}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {driver && (
            <button onClick={cancel} className="flex-1 rounded-lg border border-border bg-secondary py-2.5 font-bold text-foreground">
              Cancelar
            </button>
          )}
          <button
            onClick={save}
            disabled={!canSave}
            className="flex-1 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    </Section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function AddTruck() {
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
      <input className={inputCls} placeholder="Placa" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} />
      <input className={inputCls} placeholder="Modelo" value={modelo} onChange={e => setModelo(e.target.value)} />
      <button onClick={async () => {
        if (!placa) return toast.error('Informe a placa');
        try {
          await db.trucks.add({ placa, modelo, ...stamp() });
          setPlaca(''); setModelo(''); toast.success('Caminhão cadastrado');
        } catch (e: any) {
          console.error('[trucks.add] erro', e);
          toast.error('Não foi possível salvar', { description: e?.message ?? String(e) });
        }
      }} className="rounded-lg gradient-primary px-3 text-primary-foreground">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function AddProducer() {
  const [nome, setNome] = useState('');
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <input className={inputCls} placeholder="Nome do produtor" value={nome} onChange={e => setNome(e.target.value)} />
      <button onClick={async () => {
        const nomeTrim = nome.trim();
        if (!nomeTrim) return toast.error('Informe o nome do produtor');
        try {
          const existente = await db.producers
            .filter(p => (p.nome ?? '').trim().toLowerCase() === nomeTrim.toLowerCase())
            .first();
          if (existente) return toast.error('Já existe um produtor com esse nome');
          await db.producers.add({ nome: nomeTrim, ...stamp() });
          setNome(''); toast.success('Produtor cadastrado');
        } catch (e: any) {
          console.error('[producers.add] erro', e);
          toast.error('Não foi possível salvar', { description: e?.message ?? String(e) });
        }
      }} className="rounded-lg gradient-primary px-3 text-primary-foreground">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

const TIPO_LABELS: Record<string, string> = {
  soja: 'Soja',
  milho: 'Milho',
  trigo: 'Trigo',
  algodao: 'Algodão',
  outros: 'Outros',
};

function AddHarvest() {
  const [tipo, setTipo] = useState('soja');
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const anos = Array.from({ length: 11 }, (_, i) => currentYear - i);

  async function add() {
    try {
      const nome = `${TIPO_LABELS[tipo] ?? tipo} - ${ano}`;
      const existente = await db.harvests
        .filter(h => h.tipo === tipo && Number(h.ano) === Number(ano))
        .first();
      if (existente) {
        return toast.error(`Já existe uma safra de ${TIPO_LABELS[tipo] ?? tipo} para o ano ${ano} ("${existente.nome}")`);
      }
      await db.harvests.add({ nome, tipo, ano, fechada: false, ...stamp() });
      toast.success(`Safra "${nome}" cadastrada`);
    } catch (e: any) {
      console.error('[harvests.add] erro', e);
      toast.error('Não foi possível salvar', { description: e?.message ?? String(e) });
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="soja">Soja</option>
          <option value="milho">Milho</option>
          <option value="trigo">Trigo</option>
          <option value="algodao">Algodão</option>
          <option value="outros">Outros</option>
        </select>
        <select className={inputCls} value={ano} onChange={e => setAno(Number(e.target.value))}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Nome gerado: <strong className="text-foreground">{TIPO_LABELS[tipo] ?? tipo} - {ano}</strong>
      </p>
      <button onClick={add} className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">
        <Plus className="h-4 w-4" /> Adicionar safra
      </button>
    </div>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 flex items-center gap-2 font-display text-xl">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ title, sub, onDel }: { title: string; sub?: string; onDel: () => void }) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-2.5">
      <div>
        <p className="font-semibold">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <button onClick={onDel} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="rounded-lg border border-dashed border-border bg-background/50 p-3 text-center text-xs text-muted-foreground">{children}</li>;
}

const inputCls = 'w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
