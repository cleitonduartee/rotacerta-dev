import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { useState, useEffect } from 'react';
import { Plus, Trash2, User, Truck as TruckIcon, Wheat, Lock, Unlock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  maskCpfCnpj,
  maskCPF,
  maskCNPJ,
  maskPhone,
  isValidCpfCnpj,
  onlyDigits,
} from '@/lib/masks';

export default function CadastrosPage() {
  const driver = useLiveQuery(() => db.drivers.toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cadastros" subtitle="Motorista, caminhões, produtores e safras" />
      <div className="space-y-6 px-4 pb-6">
        <DriverSection driver={driver[0]} />

        <Section title="Caminhões" icon={TruckIcon}>
          <AddTruck />
          <ul className="space-y-2 mt-3">
            {trucks.map(t => (
              <Row key={t.id} title={t.placa} sub={t.modelo} onDel={async () => { if (confirm('Excluir?')) await db.trucks.delete(t.id!); }} />
            ))}
            {trucks.length === 0 && <Empty>Cadastre seu primeiro caminhão.</Empty>}
          </ul>
        </Section>

        <Section title="Produtores" icon={Wheat}>
          <AddProducer />
          <ul className="space-y-2 mt-3">
            {producers.map(p => (
              <Row key={p.id} title={p.nome} onDel={async () => { if (confirm('Excluir?')) await db.producers.delete(p.id!); }} />
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
                  <span className={'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                    (h.fechada ? 'bg-muted text-muted-foreground' : 'bg-success/20 text-success')}>
                    {h.fechada ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {h.fechada ? 'Fechada' : 'Aberta'}
                  </span>
                  <button
                    onClick={async () => { if (confirm('Excluir safra?')) await db.harvests.delete(h.id!); }}
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
  );
}

function DriverSection({ driver }: { driver?: any }) {
  const [nome, setNome] = useState('');
  const [docType, setDocType] = useState<'cpf' | 'cnpj'>('cpf');
  const [doc, setDoc] = useState('');
  const [tel, setTel] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (driver) {
      setNome(driver.nome);
      const dt = driver.docType ?? (onlyDigits(driver.cpf ?? '').length > 11 ? 'cnpj' : 'cpf');
      setDocType(dt);
      setDoc(dt === 'cpf' ? maskCPF(driver.cpf ?? '') : maskCNPJ(driver.cpf ?? ''));
      setTel(maskPhone(driver.telefone ?? ''));
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [driver]);

  const dirty = !driver
    ? Boolean(nome || doc || tel)
    : (
        nome !== (driver.nome ?? '') ||
        doc !== (driver.docType === 'cnpj' ? maskCNPJ(driver.cpf ?? '') : maskCPF(driver.cpf ?? '')) ||
        tel !== maskPhone(driver.telefone ?? '') ||
        docType !== (driver.docType ?? (onlyDigits(driver.cpf ?? '').length > 11 ? 'cnpj' : 'cpf'))
      );

  const docValid = !doc || isValidCpfCnpj(doc);
  const canSave = editing && Boolean(nome) && docValid && dirty;

  async function save() {
    if (!nome) return toast.error('Informe seu nome');
    if (doc && !isValidCpfCnpj(doc)) {
      return toast.error(docType === 'cpf' ? 'CPF inválido' : 'CNPJ inválido');
    }
    const payload = { nome, docType, cpf: doc, telefone: tel };
    if (driver) await db.drivers.update(driver.id, payload);
    else await db.drivers.add(payload);
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

  function cancel() {
    if (driver) {
      const dt = driver.docType ?? (onlyDigits(driver.cpf ?? '').length > 11 ? 'cnpj' : 'cpf');
      setNome(driver.nome);
      setDocType(dt);
      setDoc(dt === 'cpf' ? maskCPF(driver.cpf ?? '') : maskCNPJ(driver.cpf ?? ''));
      setTel(maskPhone(driver.telefone ?? ''));
      setEditing(false);
    }
  }

  // Modo visualização
  if (driver && !editing) {
    return (
      <Section title="Seus dados" icon={User}>
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
          <InfoRow label="Nome" value={driver.nome} />
          <InfoRow label={(driver.docType ?? 'cpf').toUpperCase()} value={driver.cpf || '—'} />
          <InfoRow label="Telefone" value={driver.telefone || '—'} />
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

        <div className="flex gap-2">
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
        await db.trucks.add({ placa, modelo, ...stamp() });
        setPlaca(''); setModelo(''); toast.success('Caminhão cadastrado');
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
        if (!nome) return;
        await db.producers.add({ nome, ...stamp() });
        setNome(''); toast.success('Produtor cadastrado');
      }} className="rounded-lg gradient-primary px-3 text-primary-foreground">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function AddHarvest() {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('soja');
  const [ano, setAno] = useState(new Date().getFullYear());

  async function add() {
    if (!nome) return toast.error('Informe o nome da safra');
    await db.harvests.add({ nome, tipo, ano, fechada: false, ...stamp() });
    setNome('');
    toast.success('Safra cadastrada');
  }

  return (
    <div className="space-y-2">
      <input className={inputCls} placeholder="Nome (ex: Safra 2026)" value={nome} onChange={e => setNome(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="soja">Soja</option>
          <option value="milho">Milho</option>
          <option value="trigo">Trigo</option>
          <option value="algodao">Algodão</option>
          <option value="outros">Outros</option>
        </select>
        <input type="number" className={inputCls} value={ano} onChange={e => setAno(Number(e.target.value))} />
      </div>
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
