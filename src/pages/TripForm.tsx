import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, calcSafra, calcFrete, deleteWithTombstone, type Trip, type TripKind } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { todayISO, fmtBRL } from '@/lib/format';
import { Trash2, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { maskMoneyInput, parseMoney } from '@/lib/masks';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { BlockedDeleteDialog } from '@/components/BlockedDeleteDialog';

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
  const [openHarvestModal, setOpenHarvestModal] = useState(false);

  // Modais de exclusão
  const [confirmDel, setConfirmDel] = useState(false);
  const [blockedDel, setBlockedDel] = useState<React.ReactNode | null>(null);

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

  const contratoFechado = contract?.fechado;

  async function save() {
    if (!truckId) return toast.error('Selecione um caminhão');
    if (!origem || !destino) return toast.error('Informe origem e destino');
    if (kind === 'safra') {
      if (!contract) return toast.error('Cadastre um contrato para este produtor + lavoura');
      if (contratoFechado) return toast.error('Contrato fechado — não é possível cadastrar viagens');
      if (pesoKgNum <= 0) return toast.error('Informe o peso');
    } else {
      if (!parseFloat(pesoToneladas) || !parseFloat(valorPorTonelada))
        return toast.error('Informe peso e valor por tonelada');
    }

    try {
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
    } catch (e: any) {
      console.error('[trips.save] erro', e);
      toast.error('Não foi possível salvar a viagem', { description: e?.message ?? String(e) });
    }
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
              action={<QuickAdd label="Novo produtor" onClick={() => setOpenProducerModal(true)} />}
            >
              <select value={producerId} onChange={e => setProducerId(Number(e.target.value))} className={inputCls}>
                <option value="">Selecione…</option>
                {producers.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field
              label="Safra"
              action={<QuickAdd label="Nova safra" onClick={() => setOpenHarvestModal(true)} />}
            >
              <select value={harvestId} onChange={e => setHarvestId(Number(e.target.value))} className={inputCls}>
                <option value="">Selecione…</option>
                {harvests.map(h => <option key={h.id} value={h.id}>{h.nome} ({h.tipo})</option>)}
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
                      <button
                        type="button"
                        onClick={() => setOpenContractModal(true)}
                        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-warning/60 bg-warning/20 px-3 py-2 text-sm font-semibold text-warning"
                      >
                        <Plus className="h-4 w-4" /> Cadastrar contrato
                      </button>
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

      <QuickModal open={openTruckModal} onClose={() => setOpenTruckModal(false)} title="Novo caminhão">
        <QuickTruckForm
          onCancel={() => setOpenTruckModal(false)}
          onSaved={(id) => { setTruckId(id); setOpenTruckModal(false); }}
        />
      </QuickModal>

      <QuickModal open={openProducerModal} onClose={() => setOpenProducerModal(false)} title="Novo produtor">
        <QuickProducerForm
          onCancel={() => setOpenProducerModal(false)}
          onSaved={(id) => { setProducerId(id); setOpenProducerModal(false); }}
        />
      </QuickModal>

      <QuickModal open={openHarvestModal} onClose={() => setOpenHarvestModal(false)} title="Nova safra">
        <QuickHarvestForm
          onCancel={() => setOpenHarvestModal(false)}
          onSaved={(id) => { setHarvestId(id); setOpenHarvestModal(false); }}
        />
      </QuickModal>

      {producerId !== '' && harvestId !== '' && (
        <QuickModal open={openContractModal} onClose={() => setOpenContractModal(false)} title="Novo contrato">
          <QuickContractForm
            producerId={Number(producerId)}
            harvestId={Number(harvestId)}
            producerName={producers.find(p => p.id === producerId)?.nome}
            harvestName={harvests.find(h => h.id === harvestId)?.nome}
            onCancel={() => setOpenContractModal(false)}
            onSaved={() => setOpenContractModal(false)}
          />
        </QuickModal>
      )}
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

function QuickAdd({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary transition active:scale-95"
    >
      <Plus className="h-3 w-3" /> {label}
    </button>
  );
}

function QuickModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] shadow-elevated sm:rounded-2xl sm:pb-4 sm:mb-0 mb-0"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QuickTruckForm({ onSaved, onCancel }: { onSaved: (id: number) => void; onCancel: () => void }) {
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  async function save() {
    if (!placa.trim()) return toast.error('Informe a placa');
    const id = await db.trucks.add({ placa: placa.trim(), modelo: modelo.trim(), ...stamp() } as any);
    toast.success('Caminhão cadastrado');
    onSaved(Number(id));
  }
  return (
    <div className="space-y-2">
      <input className={inputCls} placeholder="Placa" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} autoFocus />
      <input className={inputCls} placeholder="Modelo (opcional)" value={modelo} onChange={e => setModelo(e.target.value)} />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-border bg-secondary py-2.5 font-bold">Cancelar</button>
        <button onClick={save} className="flex-1 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">Salvar</button>
      </div>
    </div>
  );
}

function QuickProducerForm({ onSaved, onCancel }: { onSaved: (id: number) => void; onCancel: () => void }) {
  const [nome, setNome] = useState('');
  async function save() {
    const nomeTrim = nome.trim();
    if (!nomeTrim) return toast.error('Informe o nome');
    const existente = await db.producers
      .filter(p => (p.nome ?? '').trim().toLowerCase() === nomeTrim.toLowerCase())
      .first();
    if (existente) return toast.error('Já existe um produtor com esse nome');
    const id = await db.producers.add({ nome: nomeTrim, ...stamp() } as any);
    toast.success('Produtor cadastrado');
    onSaved(Number(id));
  }
  return (
    <div className="space-y-2">
      <input className={inputCls} placeholder="Nome do produtor" value={nome} onChange={e => setNome(e.target.value)} autoFocus />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-border bg-secondary py-2.5 font-bold">Cancelar</button>
        <button onClick={save} className="flex-1 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">Salvar</button>
      </div>
    </div>
  );
}

function QuickContractForm({
  producerId, harvestId, producerName, harvestName, onSaved, onCancel,
}: {
  producerId: number; harvestId: number;
  producerName?: string; harvestName?: string;
  onSaved: () => void; onCancel: () => void;
}) {
  const [valor, setValor] = useState('');
  async function save() {
    const v = parseMoney(valor);
    if (!v) return toast.error('Informe o valor por saco');
    await db.contracts.add({
      producerId, harvestId, valorPorSaco: v, fechado: false, ...stamp(),
    } as any);
    toast.success('Contrato cadastrado');
    onSaved();
  }
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-secondary/40 p-2 text-xs">
        <p><span className="text-muted-foreground">Produtor: </span><strong>{producerName ?? '?'}</strong></p>
        <p><span className="text-muted-foreground">Lavoura: </span><strong>{harvestName ?? '?'}</strong></p>
      </div>
      <input
        className={inputCls}
        inputMode="decimal"
        placeholder="R$ por saco (60kg)"
        value={valor}
        onChange={e => setValor(maskMoneyInput(e.target.value))}
        autoFocus
      />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-border bg-secondary py-2.5 font-bold">Cancelar</button>
        <button onClick={save} className="flex-1 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">Salvar</button>
      </div>
    </div>
  );
}

const TIPO_LABELS_HARVEST: Record<string, string> = {
  soja: 'Soja', milho: 'Milho', trigo: 'Trigo', algodao: 'Algodão', outros: 'Outros',
};

function QuickHarvestForm({ onSaved, onCancel }: { onSaved: (id: number) => void; onCancel: () => void }) {
  const [tipo, setTipo] = useState('soja');
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const anos = Array.from({ length: 11 }, (_, i) => currentYear - i);
  const nome = `${TIPO_LABELS_HARVEST[tipo] ?? tipo} - ${ano}`;

  async function save() {
    const existente = await db.harvests
      .filter(h => h.tipo === tipo && Number(h.ano) === Number(ano))
      .first();
    if (existente) {
      return toast.error(`Já existe uma safra de ${TIPO_LABELS_HARVEST[tipo] ?? tipo} para ${ano}`);
    }
    const id = await db.harvests.add({ nome, tipo, ano, fechada: false, ...stamp() } as any);
    toast.success(`Safra "${nome}" cadastrada`);
    onSaved(Number(id));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="soja">Soja</option>
          <option value="milho">Milho</option>
          <option value="trigo">Trigo</option>
          <option value="algodao">Algodão</option>
          <option value="outros">Outros</option>
        </select>
        <select className={inputCls} value={ano} onChange={e => setAno(Number(e.target.value))}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Nome gerado: <strong className="text-foreground">{nome}</strong>
      </p>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-border bg-secondary py-2.5 font-bold">Cancelar</button>
        <button onClick={save} className="flex-1 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground">Salvar</button>
      </div>
    </div>
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
