import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { fmtBRL } from '@/lib/format';
import { useState } from 'react';
import { toast } from 'sonner';

export default function HarvestsList() {
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Safras" subtitle="Contratos e fechamentos" />
      <div className="px-4 pb-6 space-y-4">
        <NewHarvest />
        <ContractsButton />
        <ul className="space-y-3">
          {harvests.map(h => {
            const tripsH = trips.filter(t => {
              if (t.kind !== 'safra' || !t.contractId) return false;
              return false; // recalcular após contracts disponíveis - feito abaixo via consulta
            });
            return <HarvestCard key={h.id} h={h} />;
          })}
          {harvests.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
              <Plus className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-semibold text-foreground">Nenhuma safra cadastrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cadastre uma safra acima (ex: <em>Soja 2026</em>) para depois criar contratos com produtores.
              </p>
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}

function ContractsButton() {
  return (
    <Link to="/safras/contratos" className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-semibold">Contratos de safra</p>
        <p className="text-xs text-muted-foreground">Produtor + Safra + Valor por saco</p>
      </div>
      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase text-primary">Gerenciar</span>
    </Link>
  );
}

function NewHarvest() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('soja');
  const [ano, setAno] = useState(new Date().getFullYear());

  async function add() {
    if (!nome) return toast.error('Informe o nome da safra');
    await db.harvests.add({ nome, tipo, ano, fechada: false, ...stamp() });
    setNome(''); setOpen(false);
    toast.success('Safra cadastrada');
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="font-semibold">Nova safra</span>
        <Plus className={'h-5 w-5 text-primary transition ' + (open ? 'rotate-45' : '')} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
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
          <button onClick={add} className="w-full rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">Salvar safra</button>
        </div>
      )}
    </div>
  );
}

function HarvestCard({ h }: { h: any }) {
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.where('harvestId').equals(h.id).toArray(), [h.id]) ?? [];
  const expenses = useLiveQuery(() => db.expenses.where('harvestId').equals(h.id).toArray(), [h.id]) ?? [];

  const contractIds = new Set(contracts.map(c => c.id));
  const tripsH = trips.filter(t => t.kind === 'safra' && t.contractId && contractIds.has(t.contractId));
  const sacos = tripsH.reduce((s, t) => s + (t.sacos || 0), 0);
  const receita = tripsH.reduce((s, t) => s + t.valorTotal, 0);
  const despesa = expenses.reduce((s, e) => s + e.valor, 0);

  return (
    <Link to={`/safras/${h.id}`} className="block rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-2xl leading-none">{h.nome}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{h.tipo} • {h.ano}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini label="Viagens" v={tripsH.length} />
        <Mini label="Sacos" v={sacos.toFixed(0)} />
        <Mini label="Líquido" v={fmtBRL(receita - despesa)} />
      </div>
    </Link>
  );
}

function Mini({ label, v }: { label: string; v: any }) {
  return (
    <div className="rounded-lg bg-secondary/60 py-2">
      <p className="font-display text-lg leading-none text-foreground">{v}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
