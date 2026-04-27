import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL } from '@/lib/format';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractsPage() {
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];

  const [producerId, setProducerId] = useState<number | ''>('');
  const [harvestId, setHarvestId] = useState<number | ''>('');
  const [valor, setValor] = useState('');

  async function add() {
    if (!producerId || !harvestId || !valor) return toast.error('Preencha todos os campos');
    const v = parseFloat(valor.replace(',', '.'));
    if (!v) return toast.error('Valor inválido');
    await db.contracts.add({ producerId: Number(producerId), harvestId: Number(harvestId), valorPorSaco: v, ...stamp() });
    setValor('');
    toast.success('Contrato salvo');
  }

  async function remove(id: number) {
    if (!confirm('Excluir contrato?')) return;
    await db.contracts.delete(id);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Contratos" subtitle="Valor por saco (60kg)" />
      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          <select className={inputCls} value={producerId} onChange={e => setProducerId(Number(e.target.value))}>
            <option value="">Produtor…</option>
            {producers.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select className={inputCls} value={harvestId} onChange={e => setHarvestId(Number(e.target.value))}>
            <option value="">Safra…</option>
            {harvests.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
          </select>
          <input className={inputCls} inputMode="decimal" placeholder="R$ por saco (60kg)" value={valor} onChange={e => setValor(e.target.value)} />
          <button onClick={add} className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">
            <Plus className="h-4 w-4" /> Adicionar contrato
          </button>
        </div>

        <ul className="space-y-2">
          {contracts.map(c => {
            const p = producers.find(p => p.id === c.producerId);
            const h = harvests.find(h => h.id === c.harvestId);
            return (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="font-semibold">{p?.nome ?? '?'} • {h?.nome ?? '?'}</p>
                  <p className="text-xs text-muted-foreground">{h?.tipo}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl text-primary">{fmtBRL(c.valorPorSaco)}</span>
                  <button onClick={() => remove(c.id!)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
          {contracts.length === 0 && <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">Nenhum contrato.</p>}
        </ul>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
