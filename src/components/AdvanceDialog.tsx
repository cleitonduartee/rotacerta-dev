import { useEffect, useState } from 'react';
import { db, stamp, deleteWithTombstone, type Advance } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/DatePicker';
import { maskMoneyInput, parseMoney } from '@/lib/masks';
import { fmtBRL, fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import { Trash2, Pencil, HandCoins } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-border bg-input px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary';

const todayIso = () => new Date().toISOString().slice(0, 10);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Alvo do adiantamento — informe contractId OU tripId */
  contractId?: number;
  tripId?: number;
  /** Texto descritivo do alvo (ex.: nome do produtor / rota) */
  targetLabel?: string;
}

/**
 * Modal de adiantamentos: lança novos e lista/edita/exclui os existentes
 * do contrato ou da viagem avulsa informada.
 */
export function AdvanceDialog({ open, onOpenChange, contractId, tripId, targetLabel }: Props) {
  const [list, setList] = useState<Advance[]>([]);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayIso());
  const [observacao, setObservacao] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  async function reload() {
    const all = await db.advances.toArray();
    setList(
      all
        .filter(a => (contractId ? a.contractId === contractId : a.tripId === tripId))
        .sort((a, b) => (b.data || '').localeCompare(a.data || '')),
    );
  }

  useEffect(() => {
    if (open) {
      reload();
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contractId, tripId]);

  function resetForm() {
    setValor('');
    setData(todayIso());
    setObservacao('');
    setEditId(null);
  }

  async function salvar() {
    const v = parseMoney(valor);
    if (!v) return toast.error('Informe um valor válido');
    if (!contractId && !tripId) return toast.error('Selecione o contrato ou a viagem');
    if (editId) {
      await db.advances.update(editId, { valor: v, data, observacao: observacao || undefined, ...stamp() });
      toast.success('Adiantamento atualizado');
    } else {
      await db.advances.add({ contractId, tripId, valor: v, data, observacao: observacao || undefined, ...stamp() });
      toast.success('Adiantamento lançado');
    }
    resetForm();
    reload();
  }

  function editar(a: Advance) {
    setEditId(a.id!);
    setValor(maskMoneyInput(String(Math.round((a.valor || 0) * 100))));
    setData(a.data);
    setObservacao(a.observacao ?? '');
  }

  async function excluir(a: Advance) {
    await deleteWithTombstone('advances', a.id!);
    toast.success('Adiantamento excluído');
    if (editId === a.id) resetForm();
    reload();
  }

  const total = list.reduce((s, a) => s + (a.valor || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-primary" /> Adiantamentos
          </DialogTitle>
        </DialogHeader>

        {targetLabel && <p className="-mt-2 text-xs text-muted-foreground">{targetLabel}</p>}

        <div className="space-y-2">
          <input
            className={inputCls}
            inputMode="numeric"
            placeholder="Valor do adiantamento — ex: 1.500,00"
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
        </div>

        {list.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Lançados</span>
              <span className="text-primary">{fmtBRL(total)}</span>
            </div>
            <ul className="space-y-1.5">
              {list.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm text-primary">{fmtBRL(a.valor)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {fmtDate(a.data)}{a.observacao ? ` • ${a.observacao}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => editar(a)} className="rounded-lg p-2 text-primary hover:bg-primary/10" aria-label="Editar adiantamento">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => excluir(a)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" aria-label="Excluir adiantamento">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
          >
            Fechar
          </button>
          <button
            onClick={salvar}
            className="rounded-lg gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {editId ? 'Salvar alteração' : 'Lançar adiantamento'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
