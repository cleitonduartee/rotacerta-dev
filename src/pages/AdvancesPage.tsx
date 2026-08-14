import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, deleteWithTombstone, type Advance } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { DatePicker } from '@/components/DatePicker';
import { maskMoneyInput, parseMoney } from '@/lib/masks';
import { fmtBRL, fmtDate } from '@/lib/format';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { toast } from 'sonner';
import { HandCoins, Plus, Pencil, Trash2, X } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-border bg-input px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary';

const todayIso = () => new Date().toISOString().slice(0, 10);

type Alvo = 'contrato' | 'viagem';

export default function AdvancesPage() {
  const advances = useLiveQuery(() => db.advances.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];

  const [alvo, setAlvo] = useState<Alvo>('contrato');
  const [alvoId, setAlvoId] = useState<string>('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayIso());
  const [observacao, setObservacao] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Advance | null>(null);

  const fretes = trips.filter(t => t.kind === 'frete');

  function contratoLabel(cId?: number) {
    const c = contracts.find(cc => cc.id === cId);
    if (!c) return 'Contrato removido';
    const p = producers.find(pp => pp.id === c.producerId);
    const h = harvests.find(hh => hh.id === c.harvestId);
    return `${p?.nome ?? 'Produtor'} • ${h?.nome ?? 'Safra'}`;
  }

  function viagemLabel(tId?: number) {
    const t = trips.find(tt => tt.id === tId);
    if (!t) return 'Viagem removida';
    return `${t.transportadora || 'Frete avulso'} • ${t.origem} → ${t.destino} • ${fmtDate(t.data)}`;
  }

  const lista = useMemo(
    () => [...advances].sort((a, b) => (b.data || '').localeCompare(a.data || '')),
    [advances],
  );
  const total = lista.reduce((s, a) => s + (a.valor || 0), 0);

  function reset() {
    setEditId(null);
    setAlvoId('');
    setValor('');
    setData(todayIso());
    setObservacao('');
  }

  async function salvar() {
    const v = parseMoney(valor);
    if (!alvoId) return toast.error(alvo === 'contrato' ? 'Selecione o contrato' : 'Selecione a viagem');
    if (!v) return toast.error('Informe um valor válido');
    const payload = {
      contractId: alvo === 'contrato' ? Number(alvoId) : undefined,
      tripId: alvo === 'viagem' ? Number(alvoId) : undefined,
      valor: v,
      data,
      observacao: observacao || undefined,
      ...stamp(),
    };
    if (editId) {
      await db.advances.update(editId, payload);
      toast.success('Adiantamento atualizado');
    } else {
      await db.advances.add(payload as Advance);
      toast.success('Adiantamento lançado');
    }
    reset();
  }

  function editar(a: Advance) {
    setEditId(a.id!);
    setAlvo(a.contractId ? 'contrato' : 'viagem');
    setAlvoId(String(a.contractId ?? a.tripId ?? ''));
    setValor(maskMoneyInput(String(Math.round((a.valor || 0) * 100))));
    setData(a.data);
    setObservacao(a.observacao ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await deleteWithTombstone('advances', toDelete.id!);
    if (editId === toDelete.id) reset();
    setToDelete(null);
    toast.success('Adiantamento excluído');
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Adiantamentos" subtitle="Valores recebidos antes do fechamento" />

      <div className="space-y-4 px-4 pb-6 md:px-6">
        <div className="space-y-2 rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg leading-none">
              <HandCoins className="h-4 w-4 text-primary" />
              {editId ? 'Editar adiantamento' : 'Novo adiantamento'}
            </h2>
            {editId && (
              <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['contrato', 'viagem'] as Alvo[]).map(op => (
              <button
                key={op}
                onClick={() => { setAlvo(op); setAlvoId(''); }}
                className={
                  'rounded-lg border py-2 text-xs font-bold uppercase tracking-wider ' +
                  (alvo === op
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground')
                }
              >
                {op === 'contrato' ? 'Contrato' : 'Viagem avulsa'}
              </button>
            ))}
          </div>

          <select className={inputCls} value={alvoId} onChange={e => setAlvoId(e.target.value)}>
            <option value="">{alvo === 'contrato' ? 'Selecione o contrato…' : 'Selecione a viagem avulsa…'}</option>
            {alvo === 'contrato'
              ? contracts.map(c => (
                  <option key={c.id} value={c.id}>
                    {contratoLabel(c.id)}{c.fechado ? ' (fechado)' : ''}
                  </option>
                ))
              : fretes.map(t => (
                  <option key={t.id} value={t.id}>{viagemLabel(t.id)}</option>
                ))}
          </select>

          <input
            className={inputCls}
            inputMode="numeric"
            placeholder="Valor — ex: 1.500,00"
            value={valor}
            onChange={e => setValor(maskMoneyInput(e.target.value))}
          />
          <DatePicker value={data} onChange={setData} />
          <input
            className={inputCls}
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
          />

          <button
            onClick={salvar}
            className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated"
          >
            <Plus className="h-4 w-4" /> {editId ? 'Salvar alteração' : 'Lançar adiantamento'}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg leading-none">Histórico</h2>
            <span className="font-display text-lg text-primary">{fmtBRL(total)}</span>
          </div>

          {lista.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum adiantamento lançado ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {lista.map(a => (
                <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                        (a.contractId ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent')}>
                        {a.contractId ? 'contrato' : 'avulso'}
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtDate(a.data)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {a.contractId ? contratoLabel(a.contractId) : viagemLabel(a.tripId)}
                    </p>
                    {a.observacao && <p className="truncate text-[11px] text-muted-foreground">{a.observacao}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-display text-lg text-primary">{fmtBRL(a.valor)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => editar(a)} className="rounded-lg p-2 text-primary hover:bg-primary/10" aria-label="Editar adiantamento">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setToDelete(a)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" aria-label="Excluir adiantamento">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir adiantamento?"
        description={
          toDelete ? (
            <>Excluir o adiantamento de <strong>{fmtBRL(toDelete.valor)}</strong> de {fmtDate(toDelete.data)}?</>
          ) : null
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
