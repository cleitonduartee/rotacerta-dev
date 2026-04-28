import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { countPendingByTable, syncAll, type PendingBreakdown } from '@/lib/sync';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

const EMPTY: PendingBreakdown = {
  trucks: 0, producers: 0, harvests: 0, contracts: 0, trips: 0, expenses: 0, deletes: 0, total: 0,
};

const LABELS: Array<{ key: keyof PendingBreakdown; singular: string; plural: string }> = [
  { key: 'trips', singular: 'viagem', plural: 'viagens' },
  { key: 'expenses', singular: 'despesa', plural: 'despesas' },
  { key: 'contracts', singular: 'contrato', plural: 'contratos' },
  { key: 'harvests', singular: 'safra', plural: 'safras' },
  { key: 'producers', singular: 'produtor', plural: 'produtores' },
  { key: 'trucks', singular: 'caminhão', plural: 'caminhões' },
  { key: 'deletes', singular: 'exclusão', plural: 'exclusões' },
];

export function SyncIndicator() {
  const online = useOnlineStatus();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const breakdown = useLiveQuery(async () => countPendingByTable(), [], EMPTY);
  const pending = breakdown?.total ?? 0;

  // touch db to keep liveQuery active
  useLiveQuery(() => db.trips.count(), []);

  async function runSync(manual = false) {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      const res = await syncAll(user.id);
      if (manual) {
        if (res.ok) toast.success('Sincronização concluída');
        else toast.error('Falha ao sincronizar');
      }
    } finally {
      setSyncing(false);
    }
  }

  // Auto-sync sempre que voltar a ficar online com pendentes
  useEffect(() => {
    if (online && user && pending > 0 && !syncing) runSync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pending, user?.id]);

  const status = !online
    ? { label: 'Offline', icon: WifiOff, cls: 'bg-warning/15 text-warning border-warning/30' }
    : pending > 0
    ? { label: syncing ? 'Sincronizando…' : `${pending} pendente${pending > 1 ? 's' : ''}`, icon: RefreshCw, cls: 'bg-accent/15 text-accent border-accent/30' }
    : { label: 'Sincronizado', icon: Wifi, cls: 'bg-success/15 text-success border-success/30' };

  const Icon = status.icon;
  const items = LABELS
    .map(l => ({ ...l, count: breakdown?.[l.key] ?? 0 }))
    .filter(i => i.count > 0);

  const badge = (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        status.cls,
        pending > 0 && 'cursor-pointer hover:opacity-90',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
      <span>{status.label}</span>
      {!online && <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse-dot" />}
    </button>
  );

  if (pending === 0) return badge;

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">
              {pending} {pending > 1 ? 'itens pendentes' : 'item pendente'}
            </p>
            <p className="text-xs text-muted-foreground">
              {online ? 'Aguardando sincronização com o servidor.' : 'Você está offline. Sincronizaremos quando voltar.'}
            </p>
          </div>
          <ul className="space-y-1 text-sm">
            {items.map(i => (
              <li key={i.key} className="flex items-center justify-between">
                <span className="text-muted-foreground capitalize">
                  {i.count > 1 ? i.plural : i.singular}
                </span>
                <span className="font-semibold">{i.count}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!online || syncing}
            onClick={() => runSync(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
