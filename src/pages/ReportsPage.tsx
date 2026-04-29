import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtDate, fmtNum } from '@/lib/format';
import { Printer, Calendar, Wheat, FileText, Truck as TruckIcon, AlertTriangle } from 'lucide-react';

type Modo = 'mes' | 'safra' | 'contrato' | 'frete';

export default function ReportsPage() {
  const [modo, setModo] = useState<Modo>('mes');
  const hoje = new Date();
  const [mes, setMes] = useState<string>(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [harvestId, setHarvestId] = useState<number | ''>('');
  const [harvestTouched, setHarvestTouched] = useState(false);
  const [contratoId, setContratoId] = useState<number | ''>('');
  const [tripAvulsaId, setTripAvulsaId] = useState<number | ''>('');

  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const drivers = useLiveQuery(() => db.drivers.toArray(), []) ?? [];

  // Sugestão: safra com algum contrato em aberto (preferir mais recente)
  useEffect(() => {
    if (harvestTouched || harvestId !== '') return;
    if (harvests.length === 0 || contracts.length === 0) return;
    const abertas = harvests
      .filter(h => contracts.some(c => c.harvestId === h.id && !c.fechado))
      .sort((a, b) => (b.ano - a.ano) || ((b.id ?? 0) - (a.id ?? 0)));
    const sugerida = abertas[0] ?? [...harvests].sort((a, b) => (b.ano - a.ano))[0];
    if (sugerida?.id) setHarvestId(sugerida.id);
  }, [harvests, contracts, harvestTouched, harvestId]);

  const { tripsFiltradas, despesasFiltradas, titulo, contratosAbertos } = useMemo(() => {
    if (modo === 'mes') {
      const t = trips.filter(x => x.data?.startsWith(mes));
      const e = expenses.filter(x => x.data?.startsWith(mes));
      const [y, m] = mes.split('-');
      return { tripsFiltradas: t, despesasFiltradas: e, titulo: `Mês ${m}/${y}`, contratosAbertos: [] as any[] };
    } else if (modo === 'safra') {
      if (!harvestId) return { tripsFiltradas: [], despesasFiltradas: [], titulo: 'Selecione uma safra', contratosAbertos: [] };
      const cs = contracts.filter(c => c.harvestId === Number(harvestId));
      const cIds = new Set(cs.map(c => c.id));
      const t = trips.filter(x => x.kind === 'safra' && x.contractId && cIds.has(x.contractId));
      const e = expenses.filter(x => (x.contractId && cIds.has(x.contractId)) || x.harvestId === Number(harvestId));
      const h = harvests.find(hh => hh.id === Number(harvestId));
      const abertos = cs.filter(c => !c.fechado);
      return { tripsFiltradas: t, despesasFiltradas: e, titulo: h ? `${h.nome} • ${h.tipo} ${h.ano}` : 'Safra', contratosAbertos: abertos };
    } else if (modo === 'frete') {
      if (!tripAvulsaId) return { tripsFiltradas: [], despesasFiltradas: [], titulo: 'Selecione uma viagem avulsa', contratosAbertos: [] };
      const t = trips.filter(x => x.id === Number(tripAvulsaId) && x.kind === 'frete');
      const e = expenses.filter(x => x.tripId === Number(tripAvulsaId));
      const tt = t[0];
      return {
        tripsFiltradas: t,
        despesasFiltradas: e,
        titulo: tt ? `Frete avulso — ${fmtDate(tt.data)} • ${tt.origem}→${tt.destino}` : 'Frete avulso',
        contratosAbertos: [],
      };
    } else {
      // contrato
      if (!contratoId) return { tripsFiltradas: [], despesasFiltradas: [], titulo: 'Selecione um contrato', contratosAbertos: [] };
      const c = contracts.find(cc => cc.id === Number(contratoId));
      const t = trips.filter(x => x.kind === 'safra' && x.contractId === Number(contratoId));
      const tripIds = new Set(t.map(tt => tt.id));
      const e = expenses.filter(x =>
        x.contractId === Number(contratoId) ||
        (x.tripId && tripIds.has(x.tripId))
      );
      const p = c ? producers.find(pp => pp.id === c.producerId) : undefined;
      const h = c ? harvests.find(hh => hh.id === c.harvestId) : undefined;
      return { tripsFiltradas: t, despesasFiltradas: e, titulo: c ? `Contrato — ${p?.nome ?? '?'} / ${h?.nome ?? '?'}` : 'Contrato', contratosAbertos: [] };
    }
  }, [modo, mes, harvestId, contratoId, tripAvulsaId, trips, expenses, contracts, harvests, producers]);

  const receita = tripsFiltradas.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const totalDespesas = despesasFiltradas.reduce((s, e) => s + e.valor, 0);
  const liquido = receita - totalDespesas;
  const sacos = tripsFiltradas.filter(t => t.kind === 'safra').reduce((s, t) => s + (t.sacos || 0), 0);

  const tripsOrdenadas = [...tripsFiltradas].sort((a, b) => a.data.localeCompare(b.data));
  const despesasOrdenadas = [...despesasFiltradas].sort((a, b) => a.data.localeCompare(b.data));

  function nomeContrato(cId?: number) {
    if (!cId) return '';
    const c = contracts.find(x => x.id === cId);
    if (!c) return '';
    const p = producers.find(pp => pp.id === c.producerId);
    const h = harvests.find(hh => hh.id === c.harvestId);
    return `${p?.nome ?? '?'} / ${h?.nome ?? '?'}`;
  }
  function nomeViagem(tId?: number) {
    if (!tId) return '';
    const t = trips.find(x => x.id === tId);
    if (!t) return '';
    return `${fmtDate(t.data)} ${t.origem}→${t.destino}`;
  }
  function placa(tId: number) {
    return trucks.find(t => t.id === tId)?.placa ?? '—';
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Relatórios" subtitle="Extrato detalhado para impressão" />
      <div className="space-y-4 px-4 pb-6 print:hidden">
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-input p-1 text-[11px] font-bold">
          <button onClick={() => setModo('mes')} className={'flex items-center justify-center gap-1 rounded-md py-2 ' + (modo === 'mes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <Calendar className="h-4 w-4" /> Mensal
          </button>
          <button onClick={() => setModo('safra')} className={'flex items-center justify-center gap-1 rounded-md py-2 ' + (modo === 'safra' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <Wheat className="h-4 w-4" /> Safra
          </button>
          <button onClick={() => setModo('contrato')} className={'flex items-center justify-center gap-1 rounded-md py-2 ' + (modo === 'contrato' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <FileText className="h-4 w-4" /> Contrato
          </button>
          <button onClick={() => setModo('frete')} className={'flex items-center justify-center gap-1 rounded-md py-2 ' + (modo === 'frete' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <TruckIcon className="h-4 w-4" /> Frete
          </button>
        </div>

        {modo === 'mes' ? (
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-3 text-base" />
        ) : modo === 'safra' ? (
          <select value={harvestId} onChange={e => { setHarvestTouched(true); setHarvestId(e.target.value === '' ? '' : Number(e.target.value)); }} className="w-full rounded-lg border border-border bg-input px-3 py-3 text-base">
            <option value="">Selecione uma safra…</option>
            {harvests.map(h => <option key={h.id} value={h.id}>{h.nome} — {h.tipo} {h.ano}</option>)}
          </select>
        ) : modo === 'contrato' ? (
          <select value={contratoId} onChange={e => setContratoId(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-border bg-input px-3 py-3 text-base">
            <option value="">Selecione um contrato…</option>
            {contracts.map(c => {
              const p = producers.find(pp => pp.id === c.producerId);
              const h = harvests.find(hh => hh.id === c.harvestId);
              return <option key={c.id} value={c.id}>{p?.nome ?? '?'} / {h?.nome ?? '?'}{c.fechado ? ' — fechado' : ''}</option>;
            })}
          </select>
        ) : (
          <select value={tripAvulsaId} onChange={e => setTripAvulsaId(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-border bg-input px-3 py-3 text-base">
            <option value="">Selecione uma viagem avulsa…</option>
            {trips.filter(t => t.kind === 'frete').sort((a, b) => b.data.localeCompare(a.data)).map(t => (
              <option key={t.id} value={t.id}>{fmtDate(t.data)} • {t.origem}→{t.destino} • {fmtBRL(t.valorTotal)}</option>
            ))}
          </select>
        )}

        <button onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 font-bold text-primary-foreground shadow-elevated">
          <Printer className="h-5 w-5" /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* Área imprimível */}
      <div id="print-area" className="px-4 pb-10 print:px-0">
        <div className="mb-3 border-b border-border pb-2">
          <p className="font-display text-2xl text-primary">RotaCerta — Extrato</p>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          {drivers[0] && <p className="text-xs text-muted-foreground">{drivers[0].nome}{drivers[0].cpf ? ` • ${drivers[0].cpf}` : ''}</p>}
        </div>

        {modo === 'safra' && contratosAbertos.length > 0 && (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Atenção: existem {contratosAbertos.length} contrato{contratosAbertos.length > 1 ? 's' : ''} ainda em aberto nesta safra.</p>
              <p className="text-xs mt-1">
                O faturamento abaixo pode mudar até que todos os contratos sejam fechados:
              </p>
              <ul className="text-xs mt-1 list-disc pl-4">
                {contratosAbertos.map(c => {
                  const p = producers.find(pp => pp.id === c.producerId);
                  return <li key={c.id}>{p?.nome ?? '?'}</li>;
                })}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
          <Card label="Receita" value={fmtBRL(receita)} />
          <Card label="Despesas" value={fmtBRL(totalDespesas)} danger />
          <Card label="Líquido" value={fmtBRL(liquido)} highlight />
          <Card label="Sacos (60kg)" value={fmtNum(sacos, 1)} />
        </div>

        <h3 className="font-display text-lg mt-4 mb-2">Receitas — viagens</h3>
        {tripsOrdenadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma viagem no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-1.5 pr-2">Data</th>
                  <th className="pr-2">Tipo</th>
                  <th className="pr-2">Caminhão</th>
                  <th className="pr-2">Origem → Destino</th>
                  <th className="pr-2">Nota</th>
                  <th className="pr-2 text-right">Sacos</th>
                  <th className="pr-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {tripsOrdenadas.map(t => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-2">{fmtDate(t.data)}</td>
                    <td className="pr-2">{t.kind === 'safra' ? 'Lavoura' : 'Frete'}</td>
                    <td className="pr-2">{placa(t.truckId)}</td>
                    <td className="pr-2">{t.origem} → {t.destino}</td>
                    <td className="pr-2">{t.notaProdutor || '—'}</td>
                    <td className="pr-2 text-right">{t.sacos ? fmtNum(t.sacos, 1) : '—'}</td>
                    <td className="pr-2 text-right font-semibold">{fmtBRL(t.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={6} className="pt-2 text-right pr-2">Total receita</td>
                  <td className="pt-2 text-right pr-2 text-primary">{fmtBRL(receita)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <h3 className="font-display text-lg mt-6 mb-2">Despesas detalhadas</h3>
        {despesasOrdenadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-1.5 pr-2">Data</th>
                  <th className="pr-2">Tipo</th>
                  <th className="pr-2">Vínculo</th>
                  <th className="pr-2">Descrição</th>
                  <th className="pr-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {despesasOrdenadas.map(e => (
                  <tr key={e.id} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDate(e.data)}</td>
                    <td className="pr-2">{e.tipo}</td>
                    <td className="pr-2">{e.contractId ? nomeContrato(e.contractId) : e.tripId ? nomeViagem(e.tripId) : '—'}</td>
                    <td className="pr-2 whitespace-pre-wrap">{e.descricao || '—'}</td>
                    <td className="pr-2 text-right font-semibold text-destructive">−{fmtBRL(e.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={4} className="pt-2 text-right pr-2">Total despesas</td>
                  <td className="pt-2 text-right pr-2 text-destructive">−{fmtBRL(totalDespesas)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-4 text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Resultado líquido</p>
          <p className="font-display text-3xl text-primary">{fmtBRL(liquido)}</p>
        </div>

        <p className="mt-6 text-[10px] text-muted-foreground text-center">
          Gerado em {new Date().toLocaleString('pt-BR')} • RotaCerta
        </p>
      </div>
    </div>
  );
}

function Card({ label, value, danger, highlight }: { label: string; value: string; danger?: boolean; highlight?: boolean }) {
  return (
    <div className={'rounded-lg border p-3 min-w-0 overflow-hidden ' + (highlight ? 'border-primary/40 bg-primary/10' : 'border-border bg-card')}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className={'font-display text-lg sm:text-xl mt-1 break-all leading-tight ' + (danger ? 'text-destructive' : highlight ? 'text-primary' : '')}>{value}</p>
    </div>
  );
}
