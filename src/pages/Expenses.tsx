import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, deleteWithTombstone } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtDate, todayISO } from '@/lib/format';
import { Plus, Trash2, FileText, Truck as TruckIcon, Wallet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { maskMoneyInput, parseMoney } from '@/lib/masks';

const TIPOS_PADRAO = ['Combustível', 'Pedágio', 'Manutenção', 'Alimentação', 'Hospedagem', 'Frete retorno', 'Socorro mecânico'];

export function ExpensesList() {
  const expenses = useLiveQuery(() => db.expenses.orderBy('data').reverse().toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const navigate = useNavigate();
  const total = expenses.reduce((s, e) => s + e.valor, 0);

  function vinculoInfo(e: any): { icon: JSX.Element; label: string; cls: string } {
    if (e.contractId) {
      const c = contracts.find(cc => cc.id === e.contractId);
      const p = c ? producers.find(pp => pp.id === c.producerId) : null;
      const h = c ? harvests.find(hh => hh.id === c.harvestId) : null;
      const label = c
        ? `Contrato • ${p?.nome ?? '?'} — ${h?.nome ?? '?'}`
        : 'Contrato (removido)';
      return {
        icon: <FileText className="h-3 w-3" />,
        label,
        cls: 'bg-primary/15 text-primary border-primary/30',
      };
    }
    if (e.tripId) {
      const t = trips.find(tt => tt.id === e.tripId);
      const tr = t ? trucks.find(x => x.id === t.truckId) : null;
      const label = t
        ? `Viagem • ${fmtDate(t.data)} ${tr?.placa ?? ''} ${t.origem}→${t.destino}`
        : 'Viagem (removida)';
      return {
        icon: <TruckIcon className="h-3 w-3" />,
        label,
        cls: 'bg-accent/15 text-accent-foreground border-accent/30',
      };
    }
    return {
      icon: <Wallet className="h-3 w-3" />,
      label: 'Despesa livre',
      cls: 'bg-muted text-muted-foreground border-border',
    };
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Despesas" subtitle={fmtBRL(total)} />
      <div className="px-4 pb-6 space-y-3">
        <button
          onClick={() => navigate('/despesas/nova')}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 font-bold text-primary-foreground shadow-elevated"
        >
          <Plus className="h-5 w-5" /> Nova despesa
        </button>
        {expenses.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Nenhuma despesa registrada.
          </p>
        )}
        {expenses.map(e => {
          const v = vinculoInfo(e);
          return (
            <div key={e.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{e.tipo}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(e.data)}</p>
                  <span
                    className={`mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${v.cls}`}
                  >
                    {v.icon}
                    <span className="truncate">{v.label}</span>
                  </span>
                  {e.descricao && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.descricao}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-display text-xl text-destructive">−{fmtBRL(e.valor)}</span>
                  <button
                    onClick={async () => { if (confirm('Excluir?')) { await deleteWithTombstone('expenses', e.id!); toast.success('Excluído'); } }}
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExpenseForm() {
  const { id } = useParams();
  const editingId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  // Carregamentos leves e independentes — evitam tela branca
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.orderBy('data').reverse().limit(50).toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];

  const [tipo, setTipo] = useState<string>('Combustível');
  const [tipoOutro, setTipoOutro] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayISO());
  const [descricao, setDescricao] = useState('');
  const [vinculo, setVinculo] = useState<'nenhum' | 'contrato' | 'viagem'>('nenhum');
  const [contractId, setContractId] = useState<number | ''>('');
  const [tripId, setTripId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    db.expenses.get(editingId).then(e => {
      if (!e) return;
      const ehPadrao = TIPOS_PADRAO.includes(e.tipo);
      setTipo(ehPadrao ? e.tipo : 'Outros');
      if (!ehPadrao) setTipoOutro(e.tipo);
      setValor(e.valor ? maskMoneyInput(String(Math.round(e.valor * 100))) : '');
      setData(e.data);
      setDescricao(e.descricao ?? '');
      if (e.contractId) { setVinculo('contrato'); setContractId(e.contractId); }
      else if (e.tripId) { setVinculo('viagem'); setTripId(e.tripId); }
    });
  }, [editingId]);

  const contratosLabel = useMemo(() => {
    return contracts.map(c => {
      const p = producers.find(pp => pp.id === c.producerId);
      const h = harvests.find(hh => hh.id === c.harvestId);
      return { id: c.id!, label: `${p?.nome ?? '?'} — ${h?.nome ?? '?'}` };
    });
  }, [contracts, producers, harvests]);

  const viagensLabel = useMemo(() => {
    return trips.map(t => {
      const tr = trucks.find(x => x.id === t.truckId);
      return {
        id: t.id!,
        label: `${fmtDate(t.data)} • ${tr?.placa ?? '—'} • ${t.origem}→${t.destino}`,
      };
    });
  }, [trips, trucks]);

  async function save() {
    const v = parseMoney(valor);
    const tipoFinal = tipo === 'Outros' ? tipoOutro.trim() : tipo;
    if (!tipoFinal) return toast.error('Informe o tipo da despesa');
    if (!v) return toast.error('Informe um valor válido');

    setLoading(true);
    try {
      const payload: any = {
        tipo: tipoFinal,
        valor: v,
        data,
        descricao,
        ...stamp(),
      };
      if (vinculo === 'contrato' && contractId) {
        payload.contractId = Number(contractId);
        const c = contracts.find(cc => cc.id === Number(contractId));
        if (c) payload.harvestId = c.harvestId; // mantém compat com filtros por safra
      } else if (vinculo === 'viagem' && tripId) {
        payload.tripId = Number(tripId);
      }

      if (editingId) await db.expenses.update(editingId, payload);
      else await db.expenses.add(payload);
      toast.success('Despesa salva');
      navigate('/despesas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title={editingId ? 'Editar despesa' : 'Nova despesa'} />
      <div className="space-y-4 px-4 pb-6">
        <div>
          <span className={labelCls}>Tipo</span>
          <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
            {TIPOS_PADRAO.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="Outros">Outros (digitar)</option>
          </select>
          {tipo === 'Outros' && (
            <input
              className={inputCls + ' mt-2'}
              placeholder="Ex: Lavagem, multa, estacionamento…"
              value={tipoOutro}
              onChange={e => setTipoOutro(e.target.value)}
              autoFocus
            />
          )}
        </div>

        <div>
          <span className={labelCls}>Valor (R$)</span>
          <input
            className={inputCls}
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(maskMoneyInput(e.target.value))}
            placeholder="0,00"
          />
        </div>

        <div>
          <span className={labelCls}>Data</span>
          <input className={inputCls} type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>

        <div>
          <span className={labelCls}>Vincular despesa</span>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-input p-1 text-xs font-bold">
            {([
              ['nenhum', 'Nenhum'],
              ['contrato', 'Contrato'],
              ['viagem', 'Viagem'],
            ] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVinculo(v)}
                className={'rounded-md py-1.5 ' + (vinculo === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
              >
                {l}
              </button>
            ))}
          </div>
          {vinculo === 'contrato' && (
            <select
              className={inputCls + ' mt-2'}
              value={contractId}
              onChange={e => setContractId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Selecione um contrato…</option>
              {contratosLabel.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
          {vinculo === 'viagem' && (
            <select
              className={inputCls + ' mt-2'}
              value={tripId}
              onChange={e => setTripId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Selecione uma viagem…</option>
              {viagensLabel.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Use <strong>Contrato</strong> para despesas da safra (combustível, manutenção etc) e <strong>Viagem</strong> para despesas de fretes avulsos.
          </p>
        </div>

        <div>
          <span className={labelCls}>Descrição (aparece no relatório)</span>
          <textarea
            className={inputCls + ' min-h-[80px]'}
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Detalhe a despesa: posto, peça trocada, motivo…"
          />
        </div>

        <button
          onClick={save}
          disabled={loading}
          className="w-full rounded-xl gradient-primary py-4 text-lg font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
        >
          {loading ? 'Salvando…' : 'Salvar despesa'}
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-border bg-input px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground';
