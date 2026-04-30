import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtDate } from '@/lib/format';
import { Plus, Truck as TruckIcon, User, FileText, Building2 } from 'lucide-react';

export default function TripsList() {
  const trips = useLiveQuery(() => db.trips.orderBy('data').reverse().toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const truckMap = new Map(trucks.map(t => [t.id!, t] as const));

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

  return (
    <div className="animate-fade-in">
      <PageHeader title="Viagens" subtitle={`${trips.length} registrada${trips.length !== 1 ? 's' : ''}`} />
      <div className="px-4 pb-6 md:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {trips.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
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
                </div>
                <p className="font-display text-2xl text-primary whitespace-nowrap">{fmtBRL(t.valorTotal)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

