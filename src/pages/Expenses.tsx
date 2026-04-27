import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtDate, todayISO } from '@/lib/format';
import { Plus, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function ExpensesList() {
  const expenses = useLiveQuery(() => db.expenses.orderBy('data').reverse().toArray(), []) ?? [];
  const total = expenses.reduce((s, e) => s + e.valor, 0);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Despesas" subtitle={fmtBRL(total)} />
      <div className="px-4 pb-6 space-y-3">
        <button
          onClick={() => location.assign('/despesas/nova')}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 font-bold text-primary-foreground shadow-elevated"
        >
          <Plus className="h-5 w-5" /> Nova despesa
        </button>
        {expenses.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Nenhuma despesa registrada.
          </p>
        )}
        {expenses.map(e => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{e.tipo}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(e.data)}{e.descricao ? ` • ${e.descricao}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl text-destructive">−{fmtBRL(e.valor)}</span>
              <button onClick={async () => { if (confirm('Excluir?')) { await db.expenses.delete(e.id!); toast.success('Excluído'); } }}
                className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExpenseForm() {
  const { id } = useParams();
  const editingId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.orderBy('data').reverse().limit(50).toArray(), []) ?? [];

  const [tipo, setTipo] = useState('Combustível');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayISO());
  const [descricao, setDescricao] = useState('');
  const [harvestId, setHarvestId] = useState<number | ''>('');
  const [tripId, setTripId] = useState<number | ''>('');

  useEffect(() => {
    if (!editingId) return;
    db.expenses.get(editingId).then(e => {
      if (!e) return;
      setTipo(e.tipo); setValor(String(e.valor)); setData(e.data);
      setDescricao(e.descricao ?? '');
      setHarvestId(e.harvestId ?? ''); setTripId(e.tripId ?? '');
    });
  }, [editingId]);

  async function save() {
    const v = parseFloat(valor.replace(',', '.'));
    if (!tipo || !v) return toast.error('Informe tipo e valor');
    const payload = {
      tipo, valor: v, data, descricao,
      harvestId: harvestId === '' ? undefined : Number(harvestId),
      tripId: tripId === '' ? undefined : Number(tripId),
      ...stamp(),
    };
    if (editingId) await db.expenses.update(editingId, payload);
    else await db.expenses.add(payload);
    toast.success('Despesa salva');
    navigate('/despesas');
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Nova despesa" />
      <div className="space-y-4 px-4 pb-6">
        <Field label="Tipo">
          <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
            {['Combustível', 'Pedágio', 'Manutenção', 'Alimentação', 'Hospedagem', 'Frete retorno', 'Outros'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Valor (R$)">
          <input className={inputCls} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Data">
          <input className={inputCls} type="date" value={data} onChange={e => setData(e.target.value)} />
        </Field>
        <Field label="Vincular à safra (opcional)">
          <select className={inputCls} value={harvestId} onChange={e => setHarvestId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Nenhuma</option>
            {harvests.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
          </select>
        </Field>
        <Field label="Vincular à viagem (opcional)">
          <select className={inputCls} value={tripId} onChange={e => setTripId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Nenhuma</option>
            {trips.map(t => <option key={t.id} value={t.id}>{fmtDate(t.data)} — {t.origem} → {t.destino}</option>)}
          </select>
        </Field>
        <Field label="Descrição">
          <textarea className={inputCls + ' min-h-[80px]'} value={descricao} onChange={e => setDescricao(e.target.value)} />
        </Field>
        <button onClick={save} className="w-full rounded-xl gradient-primary py-4 text-lg font-bold text-primary-foreground shadow-elevated">
          Salvar despesa
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-border bg-input px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
