import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, deleteWithTombstone } from '@/lib/db';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { BlockedDeleteDialog } from '@/components/BlockedDeleteDialog';
import { Plus, Truck as TruckIcon, User, FileText, Building2, CheckCircle2, CircleDollarSign, Trash2, HandCoins } from 'lucide-react';
import { AdvanceDialog } from '@/components/AdvanceDialog';


async function toggleRecebido(t: any) {
  const novo = !t.recebido;
  await db.trips.update(t.id!, { recebido: novo, recebidoEm: novo ? Date.now() : undefined, ...stamp() });
  toast.success(novo ? 'Frete marcado como recebido' : 'Recebimento desmarcado');
}

export default function TripsList() {
  const trips = useLiveQuery(() => db.trips.orderBy('data').reverse().toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];
  const advances = useLiveQuery(() => db.advances.toArray(), []) ?? [];
  const truckMap = new Map(trucks.map(t => [t.id!, t] as const));

  const [toDelete, setToDelete] = useState<any | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<{ tripId: number; label: string } | null>(null);
  const [blocked, setBlocked] = useState<{ open: boolean; description: React.ReactNode }>({ open: false, description: null });

  function ownerInfo(t: any) {
    if (t.kind === 'safra' && t.contractId) {
      const c = contracts.find(cc => cc.id === t.contractId);
      const p = c ? producers.find(pp => pp.id === c.producerId) : null;
      const h = c ? harvests.find(hh => hh.id === c.harvestId) : null;
      return {
        owner: p?.nome ?? 'Produtor removido',
        detail: h?.nome ?? 'Contrato',
      };
    }
    if (t.kind === 'frete') {
      return { owner: t.transportadora || 'Frete avulso', detail: null as string | null };
    }
    return null;
  }

  function askRemove(t: any) {
    if (t.kind === 'safra' && t.contractId) {
      const c = contracts.find(cc => cc.id === t.contractId);
      if (c?.fechado) {
        setBlocked({
          open: true,
          description: (
            <>
              Esta viagem pertence a um <strong>contrato já fechado</strong> e não pode ser excluída.
              Reabra o contrato em <strong>Contratos</strong> se precisar alterá-la.
            </>
          ),
        });
        return;
      }
    }
    if (t.kind === 'frete' && t.recebido) {
      setBlocked({
        open: true,
        description: (
          <>
            Este frete avulso já foi marcado como <strong>recebido</strong> e não pode ser excluído.
            Desmarque o recebimento antes de excluir.
          </>
        ),
      });
      return;
    }
    const vinculadas = expenses.filter(e => e.tripId === t.id).length;
    if (vinculadas > 0) {
      setBlocked({
        open: true,
        description: (
          <>
            Existem <strong>{vinculadas}</strong> despesa{vinculadas !== 1 ? 's' : ''} vinculada
            {vinculadas !== 1 ? 's' : ''} a esta viagem. Exclua-as primeiro.
          </>
        ),
      });
      return;
    }
    setToDelete(t);
  }

  async function confirmRemove() {
    if (!toDelete) return;
    await deleteWithTombstone('trips', toDelete.id!);
    setToDelete(null);
    toast.success('Viagem excluída');
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Viagens" subtitle={`${trips.length} registrada${trips.length !== 1 ? 's' : ''}`} />
      <div className="px-4 pb-6 md:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {trips.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <TruckIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma viagem ainda.</p>
            <Link to="/viagens/nova" className="mt-4 inline-flex items-center gap-2 rounded-full gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-elevated">
              <Plus className="h-4 w-4" /> Cadastrar primeira viagem
            </Link>
          </div>
        )}
        {trips.map(t => {
          const info = ownerInfo(t);
          return (
            <Link
              key={t.id}
              to={`/viagens/${t.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-card transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                      (t.kind === 'safra' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent')}>
                      {t.kind === 'safra' ? 'lavoura' : t.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDate(t.data)}</span>
                    {t.syncStatus === 'pending' && (
                      <span className="text-[10px] font-bold uppercase text-warning">• pendente</span>
                    )}
                  </div>
                  <p className="mt-1 font-semibold truncate">{t.origem} → {t.destino}</p>

                  {info && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ' +
                        (t.kind === 'safra'
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-accent/10 text-accent-foreground border-accent/30')}>
                        {t.kind === 'safra'
                          ? <User className="h-3 w-3" />
                          : <Building2 className="h-3 w-3" />}
                        <span className="truncate">{info.owner}</span>
                      </span>
                      {info.detail && (
                        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{info.detail}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-1">
                    {truckMap.get(t.truckId)?.placa ?? '—'}
                    {t.kind === 'safra' && t.sacos != null && <> • {t.sacos.toFixed(1)} sacos</>}
                    {t.kind === 'frete' && t.pesoToneladas != null && <> • {t.pesoToneladas} t</>}
                  </p>

                  {t.kind === 'frete' && (() => {
                    const adiantado = advances
                      .filter(a => a.tripId === t.id)
                      .reduce((s, a) => s + (a.valor || 0), 0);
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRecebido(t); }}
                          className={
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ' +
                            (t.recebido
                              ? 'bg-success text-success-foreground'
                              : 'border border-warning/40 bg-warning/10 text-warning')
                          }
                        >
                          {t.recebido ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDollarSign className="h-3.5 w-3.5" />}
                          {t.recebido ? 'Recebido' : 'Marcar recebido'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            setAdvanceTarget({ tripId: t.id!, label: `${t.transportadora || 'Frete avulso'} • ${t.origem} → ${t.destino}` });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary"
                        >
                          <HandCoins className="h-3.5 w-3.5" />
                          {adiantado > 0 ? `Adiant. ${fmtBRL(adiantado)}` : 'Adiantamento'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-display text-2xl text-primary whitespace-nowrap">{fmtBRL(t.valorTotal)}</p>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); askRemove(t); }}
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                    aria-label="Excluir viagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        description={
          toDelete ? (
            <>
              Excluir a viagem <strong>{toDelete.origem} → {toDelete.destino}</strong> de{' '}
              {fmtDate(toDelete.data)}? Esta ação não pode ser desfeita.
            </>
          ) : null
        }
        onConfirm={confirmRemove}
      />

      <BlockedDeleteDialog
        open={blocked.open}
        onOpenChange={(o) => setBlocked(b => ({ ...b, open: o }))}
        title="Não é possível excluir a viagem"
        description={blocked.description}
      />

      <AdvanceDialog
        open={!!advanceTarget}
        onOpenChange={(o) => !o && setAdvanceTarget(null)}
        tripId={advanceTarget?.tripId}
        targetLabel={advanceTarget?.label}
      />
    </div>
  );
}
