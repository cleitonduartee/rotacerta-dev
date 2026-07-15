import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Plus, Wrench, Trash2, Pencil, X, Calendar, Truck as TruckIcon, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import {
  db,
  stamp,
  deleteWithTombstone,
  formatMaintenance,
  MAINTENANCE_TIPO_LABEL,
  type Maintenance,
  type MaintenanceTipo,
} from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { DatePicker } from '@/components/DatePicker';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { fmtDate, todayISO } from '@/lib/format';
import { onlyDigits } from '@/lib/masks';

// Grupo pai "Troca de óleo" seleciona um sub-tipo (motor/câmbio/diferencial)
type TipoBase =
  | 'oleo'
  | 'revisao_cubo'
  | 'troca_pneu'
  | 'lona_freio'
  | 'campana'
  | 'outro';

const TIPO_BASE_OPTIONS: { value: TipoBase; label: string }[] = [
  { value: 'oleo', label: 'Troca de óleo' },
  { value: 'revisao_cubo', label: 'Revisão de cubo' },
  { value: 'troca_pneu', label: 'Troca de pneu' },
  { value: 'lona_freio', label: 'Troca de lona de freio' },
  { value: 'campana', label: 'Troca de campana' },
  { value: 'outro', label: 'Outro' },
];

const OLEO_SUBS: { value: MaintenanceTipo; label: string }[] = [
  { value: 'oleo_motor', label: 'Motor' },
  { value: 'oleo_cambio', label: 'Câmbio' },
  { value: 'oleo_diferencial', label: 'Diferencial' },
];

function tipoToBase(tipo: MaintenanceTipo): { base: TipoBase; sub?: MaintenanceTipo } {
  if (tipo === 'oleo_motor' || tipo === 'oleo_cambio' || tipo === 'oleo_diferencial') {
    return { base: 'oleo', sub: tipo };
  }
  return { base: tipo as TipoBase };
}

export default function MaintenancePage() {
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const items = useLiveQuery(
    () => db.maintenances.orderBy('data').reverse().toArray(),
    [],
  ) ?? [];

  const [filterTruck, setFilterTruck] = useState<number | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [del, setDel] = useState<Maintenance | null>(null);

  const trucksById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of trucks) if (t.id != null) m.set(t.id, t.placa);
    return m;
  }, [trucks]);

  const filtered = filterTruck === 'all' ? items : items.filter(i => i.truckId === filterTruck);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(m: Maintenance) {
    setEditing(m);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!del?.id) return;
    await deleteWithTombstone('maintenances', del.id);
    toast.success('Manutenção excluída');
    setDel(null);
  }

  return (
    <div>
      <PageHeader
        title="Manutenções"
        subtitle="Histórico de manutenções por caminhão"
        action={
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg gradient-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-elevated active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" strokeWidth={3} /> Nova
          </button>
        }
      />

      <div className="px-4 pb-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filtrar por caminhão
        </label>
        <select
          value={String(filterTruck)}
          onChange={(e) => setFilterTruck(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-base"
        >
          <option value="all">Todos os caminhões</option>
          {trucks.map(t => (
            <option key={t.id} value={t.id}>{t.placa}{t.modelo ? ` — ${t.modelo}` : ''}</option>
          ))}
        </select>
      </div>

      <div className="px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
            <Wrench className="mx-auto mb-2 h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada ainda.</p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(m => {
              const placa = trucksById.get(m.truckId) ?? '—';
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                        <TruckIcon className="h-3.5 w-3.5" /> {placa}
                      </div>
                      <p className="mt-1 font-display text-xl leading-tight text-foreground">
                        {formatMaintenance(m.tipo, m.tipoOutro)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEdit(m)}
                        aria-label="Editar"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDel(m)}
                        aria-label="Excluir"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {fmtDate(m.data)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" /> {m.km.toLocaleString('pt-BR')} km
                    </span>
                  </div>

                  {m.observacao && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                      {m.observacao}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {formOpen && (
        <MaintenanceForm
          key={editing?.id ?? 'new'}
          initial={editing}
          trucks={trucks}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDeleteDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Excluir manutenção"
        description={del ? `Tem certeza que deseja excluir "${formatMaintenance(del.tipo, del.tipoOutro)}"?` : ''}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ---------- Formulário ----------

interface FormProps {
  initial: Maintenance | null;
  trucks: Awaited<ReturnType<typeof db.trucks.toArray>>;
  onClose: () => void;
}

function MaintenanceForm({ initial, trucks, onClose }: FormProps) {
  const initBase = initial ? tipoToBase(initial.tipo) : { base: 'oleo' as TipoBase, sub: 'oleo_motor' as MaintenanceTipo };

  const [truckId, setTruckId] = useState<number | ''>(initial?.truckId ?? (trucks[0]?.id ?? ''));
  const [tipoBase, setTipoBase] = useState<TipoBase>(initBase.base);
  const [oleoSub, setOleoSub] = useState<MaintenanceTipo>(initBase.sub ?? 'oleo_motor');
  const [tipoOutro, setTipoOutro] = useState(initial?.tipoOutro ?? '');
  const [km, setKm] = useState(initial ? String(initial.km) : '');
  const [data, setData] = useState(initial?.data ?? todayISO());
  const [observacao, setObservacao] = useState(initial?.observacao ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!truckId) return toast.error('Selecione um caminhão');
    if (tipoBase === 'outro' && !tipoOutro.trim()) return toast.error('Informe qual foi a manutenção');
    const kmNum = Number(onlyDigits(km));
    if (!kmNum || kmNum <= 0) return toast.error('Informe o KM atual');

    let tipoFinal: MaintenanceTipo;
    if (tipoBase === 'oleo') tipoFinal = oleoSub;
    else tipoFinal = tipoBase as MaintenanceTipo;

    const payload: Omit<Maintenance, 'id'> = {
      truckId: Number(truckId),
      tipo: tipoFinal,
      tipoOutro: tipoBase === 'outro' ? tipoOutro.trim() : undefined,
      km: kmNum,
      data,
      observacao: observacao.trim() || undefined,
      ...stamp(),
    };

    setSaving(true);
    try {
      if (initial?.id) {
        await db.maintenances.update(initial.id, payload);
        toast.success('Manutenção atualizada');
      } else {
        await db.maintenances.add(payload as Maintenance);
        toast.success('Manutenção registrada');
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
      <form
        onSubmit={handleSave}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border/60 bg-background p-5 shadow-elevated md:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-foreground">
            {initial ? 'Editar manutenção' : 'Nova manutenção'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Caminhão
            </label>
            <select
              value={truckId === '' ? '' : String(truckId)}
              onChange={(e) => setTruckId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-base"
            >
              <option value="">Selecione</option>
              {trucks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.placa}{t.modelo ? ` — ${t.modelo}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tipo de manutenção
            </label>
            <select
              value={tipoBase}
              onChange={(e) => setTipoBase(e.target.value as TipoBase)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-base"
            >
              {TIPO_BASE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {tipoBase === 'oleo' && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qual óleo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {OLEO_SUBS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOleoSub(o.value)}
                    className={
                      'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ' +
                      (oleoSub === o.value
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-input text-foreground hover:border-primary/50')
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tipoBase === 'outro' && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informe a manutenção
              </label>
              <input
                type="text"
                value={tipoOutro}
                onChange={(e) => setTipoOutro(e.target.value)}
                placeholder="Ex: Alinhamento e balanceamento"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-base"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Data
              </label>
              <DatePicker value={data} onChange={setData} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                KM atual
              </label>
              <input
                inputMode="numeric"
                value={km}
                onChange={(e) => setKm(onlyDigits(e.target.value))}
                placeholder="Ex: 348500"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-base"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Observação
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Detalhes, marca do óleo, oficina, etc. (opcional)"
              className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-base"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-secondary py-2.5 font-semibold text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground/70">
          Opções pré-cadastradas: {Object.values(MAINTENANCE_TIPO_LABEL).filter(l => l !== 'Outro').join(' • ')}
        </p>
      </form>
    </div>
  );
}
