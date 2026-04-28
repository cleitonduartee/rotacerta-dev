import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, calcSafra, calcFrete, deleteWithTombstone, type Trip, type TripKind } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { todayISO, fmtBRL } from '@/lib/format';
import { Trash2, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { maskMoneyInput, parseMoney } from '@/lib/masks';

export default function TripForm() {
  const { id } = useParams();
  const editingId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];

  const [kind, setKind] = useState<TripKind>('safra');
  const [data, setData] = useState(todayISO());
  const [truckId, setTruckId] = useState<number | ''>('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [origemTouched, setOrigemTouched] = useState(false);
  const [destinoTouched, setDestinoTouched] = useState(false);

  // safra
  const [producerId, setProducerId] = useState<number | ''>('');
  const [harvestId, setHarvestId] = useState<number | ''>('');
  const [pesoKg, setPesoKg] = useState<string>('');
  const [unidadePeso, setUnidadePeso] = useState<'kg' | 't'>('t');
  const [valorPorSacoOverride, setValorPorSacoOverride] = useState<string>('');

  // frete
  const [transportadora, setTransportadora] = useState('');
  const [pesoToneladas, setPesoToneladas] = useState<string>('');
  const [valorPorTonelada, setValorPorTonelada] = useState<string>('');

  const [observacao, setObservacao] = useState('');
  const [notaProdutor, setNotaProdutor] = useState('');
  const [loaded, setLoaded] = useState(!editingId);

  // Modais de cadastro rápido
  const [openTruckModal, setOpenTruckModal] = useState(false);
  const [openProducerModal, setOpenProducerModal] = useState(false);
  const [openContractModal, setOpenContractModal] = useState(false);

  // Carregar para edição
  useEffect(() => {
    if (!editingId) return;
    db.trips.get(editingId).then(t => {
      if (!t) return;
      setKind(t.kind); setData(t.data); setTruckId(t.truckId);
      setOrigem(t.origem); setDestino(t.destino);
      setOrigemTouched(true); setDestinoTouched(true);
      if (t.kind === 'safra') {
        const c = t.contractId ? contracts.find(c => c.id === t.contractId) : undefined;
        if (c) { setProducerId(c.producerId); setHarvestId(c.harvestId); }
        setPesoKg(t.pesoKg?.toString() ?? '');
        setValorPorSacoOverride(t.valorPorSacoOverride?.toString() ?? '');
      } else {
        setTransportadora(t.transportadora ?? '');
        setPesoToneladas(t.pesoToneladas?.toString() ?? '');
        setValorPorTonelada(t.valorPorTonelada?.toString() ?? '');
      }
      setObservacao(t.observacao ?? '');
      setNotaProdutor(t.notaProdutor ?? '');
      setLoaded(true);
    });
  }, [editingId, contracts]);

  // Sugestões inteligentes (apenas em criação)
  useEffect(() => {
    if (editingId) return;
    if (truckId === '' && trucks[0]) setTruckId(trucks[0].id!);
    if (kind === 'safra') {
      // último produtor: ler do localStorage
      if (producerId === '') {
        const last = localStorage.getItem('lastProducerId');
        if (last && producers.find(p => p.id === Number(last))) setProducerId(Number(last));
      }
    }
  }, [trucks, harvests, producers, kind, data]);

  // Quando o produtor mudar, auto-selecionar a safra do contrato vigente (não fechado)
  useEffect(() => {
    if (editingId || kind !== 'safra' || producerId === '') return;
    const abertos = contracts.filter(c => c.producerId === producerId && !c.fechado);
    // Se a safra atual não tem contrato com este produtor, escolher um contrato aberto
    const jaTemContratoNaSafraAtual = harvestId !== '' &&
      contracts.some(c => c.producerId === producerId && c.harvestId === harvestId);
    if (jaTemContratoNaSafraAtual) return;
    if (abertos.length >= 1) {
      // Preferir safra do ano da viagem
      const year = new Date(data).getFullYear();
      const h = abertos.find(c => harvests.find(h => h.id === c.harvestId)?.ano === year) ?? abertos[0];
      setHarvestId(h.harvestId);
    }
  }, [producerId, contracts, harvests, kind, data, editingId]);

  // Contrato vigente (produtor + safra)
  const contract = useMemo(() => {
    if (kind !== 'safra' || producerId === '' || harvestId === '') return undefined;
    return contracts.find(c => c.producerId === producerId && c.harvestId === harvestId);
  }, [kind, producerId, harvestId, contracts]);

  // Auto-preencher origem/destino com base na última viagem deste contrato
  useEffect(() => {
    if (editingId || kind !== 'safra' || !contract?.id) return;
    db.trips
      .where('contractId').equals(contract.id)
      .reverse().sortBy('data')
      .then(list => {
        const last = list[0];
        if (!last) return;
        if (!origemTouched && !origem) setOrigem(last.origem || '');
        if (!destinoTouched && !destino) setDestino(last.destino || '');
      });
  }, [contract?.id, editingId, kind]);

  const pesoKgNum = useMemo(() => {
    const v = parseFloat(pesoKg.replace(',', '.')) || 0;
    return unidadePeso === 't' ? v * 1000 : v;
  }, [pesoKg, unidadePeso]);

  const valorPorSacoUsado = parseFloat(valorPorSacoOverride.replace(',', '.')) || contract?.valorPorSaco || 0;

  const calc = useMemo(() => {
    if (kind === 'safra') return calcSafra(pesoKgNum, valorPorSacoUsado);
    const pt = parseFloat(pesoToneladas.replace(',', '.')) || 0;
    const vt = parseFloat(valorPorTonelada.replace(',', '.')) || 0;
    return { sacos: 0, valorTotal: calcFrete(pt, vt) };
  }, [kind, pesoKgNum, valorPorSacoUsado, pesoToneladas, valorPorTonelada]);

  const harvestFechada = harvestId !== '' && harvests.find(h => h.id === harvestId)?.fechada;
  const contratoFechado = contract?.fechado;

  async function save() {
    if (!truckId) return toast.error('Selecione um caminhão');
    if (!origem || !destino) return toast.error('Informe origem e destino');
    if (kind === 'safra') {
      if (!contract) return toast.error('Cadastre um contrato para este produtor + lavoura');
      if (contratoFechado) return toast.error('Contrato fechado — não é possível cadastrar viagens');
      if (harvestFechada) return toast.error('Safra fechada — não é possível cadastrar viagens');
      if (pesoKgNum <= 0) return toast.error('Informe o peso');
    } else {
      if (!parseFloat(pesoToneladas) || !parseFloat(valorPorTonelada))
        return toast.error('Informe peso e valor por tonelada');
    }

    const trip: Trip = {
      kind, data,
      truckId: Number(truckId),
      origem, destino,
      contractId: kind === 'safra' ? contract!.id : undefined,
      pesoKg: kind === 'safra' ? pesoKgNum : undefined,
      sacos: kind === 'safra' ? calc.sacos : undefined,
      valorPorSacoOverride: kind === 'safra' && valorPorSacoOverride ? parseFloat(valorPorSacoOverride.replace(',', '.')) : undefined,
      transportadora: kind === 'frete' ? transportadora : undefined,
      pesoToneladas: kind === 'frete' ? parseFloat(pesoToneladas.replace(',', '.')) : undefined,
      valorPorTonelada: kind === 'frete' ? parseFloat(valorPorTonelada.replace(',', '.')) : undefined,
      valorTotal: calc.valorTotal,
      observacao,
      notaProdutor: notaProdutor.trim() || undefined,
      ...stamp(),
    };

    if (editingId) await db.trips.update(editingId, trip);
    else await db.trips.add(trip);

    if (kind === 'safra' && producerId !== '') localStorage.setItem('lastProducerId', String(producerId));
    toast.success(editingId ? 'Viagem atualizada' : 'Viagem salva');
    navigate('/viagens');
  }

  async function remove() {
    if (!editingId) return;
    if (!confirm('Excluir esta viagem?')) return;
    await deleteWithTombstone('trips', editingId);
    toast.success('Viagem excluída');
    navigate('/viagens');
  }

  if (!loaded) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader title={editingId ? 'Editar viagem' : 'Nova viagem'} />
      <div className="space-y-4 px-4 pb-32">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-1">
          {(['safra', 'frete'] as const).map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={'rounded-lg py-3 text-sm font-bold uppercase tracking-wide transition ' +
                (kind === k ? 'gradient-primary text-primary-foreground shadow-elevated' : 'text-muted-foreground')}
            >
              {k === 'safra' ? 'Lavoura' : 'Frete avulso'}
            </button>
          ))}
        </div>

        <Field label="Data">
          <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
        </Field>

        <Field
          label="Caminhão"
          action={<QuickAdd label="Novo caminhão" onClick={() => setOpenTruckModal(true)} />}
        >
          <select value={truckId} onChange={e => setTruckId(Number(e.target.value))} className={inputCls}>
            <option value="">Selecione…</option>
            {trucks.map(t => <option key={t.id} value={t.id}>{t.placa}{t.modelo ? ` — ${t.modelo}` : ''}</option>)}
          </select>
          {trucks.length === 0 && <p className="mt-1 text-xs text-warning">Cadastre um caminhão em "Cadastros".</p>}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Origem"><input value={origem} onChange={e => { setOrigem(e.target.value); setOrigemTouched(true); }} className={inputCls} placeholder="Cidade/fazenda" /></Field>
          <Field label="Destino"><input value={destino} onChange={e => { setDestino(e.target.value); setDestinoTouched(true); }} className={inputCls} placeholder="Cidade/armazém" /></Field>
        </div>
        {kind === 'safra' && contract && (origem || destino) && !editingId && (
          <p className="-mt-2 text-xs text-muted-foreground">
            ✓ Origem/destino sugeridos da última viagem deste contrato. Edite se precisar.
          </p>
        )}

        {kind === 'safra' ? (
          <>
            <Field
              label="Produtor"
              action={<QuickAdd to="/cadastros" label="Novo produtor" />}
            >
              <select value={producerId} onChange={e => setProducerId(Number(e.target.value))} className={inputCls}>
                <option value="">Selecione…</option>
                {producers.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="Safra">
              <select value={harvestId} onChange={e => setHarvestId(Number(e.target.value))} className={inputCls}>
                <option value="">Selecione…</option>
                {harvests.map(h => <option key={h.id} value={h.id}>{h.nome} ({h.tipo}){h.fechada ? ' — fechada' : ''}</option>)}
              </select>
            </Field>

            {producerId !== '' && harvestId !== '' && !contract && (
              <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                Sem contrato para este produtor nesta safra.
                {(() => {
                  const outros = contracts.filter(c => c.producerId === producerId && !c.fechado);
                  return (
                    <div className="mt-2 space-y-1">
                      {outros.length > 0 && (
                        <>
                          <p className="text-xs">Contratos disponíveis para este produtor:</p>
                          {outros.map(c => {
                            const h = harvests.find(h => h.id === c.harvestId);
                            return (
                              <button key={c.id} type="button" onClick={() => setHarvestId(c.harvestId)}
                                className="block w-full rounded-lg border border-warning/40 bg-card px-3 py-2 text-left text-sm text-foreground">
                                Usar safra <strong>{h?.nome ?? '?'}</strong>
                              </button>
                            );
                          })}
                        </>
                      )}
                      <Link
                        to="/contratos"
                        className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-warning/60 bg-warning/20 px-3 py-2 text-sm font-semibold text-warning"
                      >
                        <Plus className="h-4 w-4" /> Cadastrar contrato
                      </Link>
                    </div>
                  );
                })()}
              </div>
            )}

            {contratoFechado && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Contrato fechado — não é possível cadastrar viagens.
              </div>
            )}

            <Field label={`Peso (${unidadePeso})`}>
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={pesoKg}
                  onChange={e => setPesoKg(e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-input p-1 text-xs font-bold">
                  {(['kg', 't'] as const).map(u => (
                    <button key={u} onClick={() => setUnidadePeso(u)}
                      className={'rounded-md px-3 ' + (unidadePeso === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field label={`Valor por saco (R$) ${contract ? `— contrato: ${fmtBRL(contract.valorPorSaco)}` : ''}`}>
              <input
                inputMode="decimal"
                value={valorPorSacoOverride}
                onChange={e => setValorPorSacoOverride(e.target.value)}
                placeholder={contract ? `Padrão ${fmtBRL(contract.valorPorSaco)}` : 'Informe'}
                className={inputCls}
              />
            </Field>

            <Summary
              rows={[
                ['Sacos (60kg)', calc.sacos.toFixed(2)],
                ['Valor / saco', fmtBRL(valorPorSacoUsado)],
                ['Valor total', fmtBRL(calc.valorTotal)],
              ]}
            />
          </>
        ) : (
          <>
            <Field label="Transportadora"><input value={transportadora} onChange={e => setTransportadora(e.target.value)} className={inputCls} placeholder="Opcional" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Peso (toneladas)">
                <input inputMode="decimal" value={pesoToneladas} onChange={e => setPesoToneladas(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
              <Field label="Valor / tonelada (R$)">
                <input inputMode="decimal" value={valorPorTonelada} onChange={e => setValorPorTonelada(e.target.value)} className={inputCls} placeholder="0" />
              </Field>
            </div>
            <Summary rows={[['Valor total', fmtBRL(calc.valorTotal)]]} />
          </>
        )}

        <Field label="Nº da nota do produtor (opcional)">
          <input value={notaProdutor} onChange={e => setNotaProdutor(e.target.value)} className={inputCls} placeholder="Ex: 12345" />
        </Field>

        <Field label="Observação">
          <textarea value={observacao} onChange={e => setObservacao(e.target.value)} className={inputCls + ' min-h-[80px]'} />
        </Field>

        <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-4 text-lg font-bold text-primary-foreground shadow-elevated active:scale-[0.98]">
          <Save className="h-5 w-5" /> {editingId ? 'Atualizar viagem' : 'Salvar viagem'}
        </button>

        {editingId && (
          <button onClick={remove} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 py-3 font-semibold text-destructive">
            <Trash2 className="h-4 w-4" /> Excluir viagem
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-input px-3 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary';

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {action}
      </div>
      {children}
    </label>
  );
}

function QuickAdd({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary transition active:scale-95"
    >
      <Plus className="h-3 w-3" /> {label}
    </Link>
  );
}

function Summary({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      {rows.map(([k, v], i) => (
        <div key={i} className={'flex items-baseline justify-between ' + (i === rows.length - 1 ? 'mt-2 border-t border-primary/20 pt-2' : 'py-0.5')}>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</span>
          <span className={i === rows.length - 1 ? 'font-display text-2xl text-primary' : 'font-semibold text-foreground'}>{v}</span>
        </div>
      ))}
    </div>
  );
}
