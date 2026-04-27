import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { useState, useEffect } from 'react';
import { Plus, Trash2, User, Truck as TruckIcon, Wheat } from 'lucide-react';
import { toast } from 'sonner';

export default function CadastrosPage() {
  const driver = useLiveQuery(() => db.drivers.toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cadastros" subtitle="Caminhoneiro, caminhões e produtores" />
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
      </div>
    </div>
  );
}

function DriverSection({ driver }: { driver?: any }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [tel, setTel] = useState('');
  useEffect(() => {
    if (driver) { setNome(driver.nome); setCpf(driver.cpf ?? ''); setTel(driver.telefone ?? ''); }
  }, [driver]);
  async function save() {
    if (!nome) return toast.error('Informe seu nome');
    if (driver) await db.drivers.update(driver.id, { nome, cpf, telefone: tel });
    else await db.drivers.add({ nome, cpf, telefone: tel });
    toast.success('Dados salvos');
  }
  return (
    <Section title="Seus dados" icon={User}>
      <div className="space-y-2 mt-2">
        <input className={inputCls} placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="CPF" value={cpf} onChange={e => setCpf(e.target.value)} />
          <input className={inputCls} placeholder="Telefone" value={tel} onChange={e => setTel(e.target.value)} />
        </div>
        <button onClick={save} className="w-full rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">Salvar</button>
      </div>
    </Section>
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
