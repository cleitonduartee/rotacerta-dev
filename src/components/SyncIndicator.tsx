import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { countPending, syncAll } from '@/lib/sync';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

export function SyncIndicator() {
  const online = useOnlineStatus();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const pending = useLiveQuery(async () => countPending(), [], 0);

  useEffect(() => {
    if (online && user && (pending ?? 0) > 0 && !syncing) {
      setSyncing(true);
      syncAll(user.id).finally(() => setSyncing(false));
    }
  }, [online, pending, user?.id]);

  // touch db to keep liveQuery active
  useLiveQuery(() => db.trips.count(), []);

  const status = !online
    ? { label: 'Offline', icon: WifiOff, cls: 'bg-warning/15 text-warning border-warning/30' }
    : (pending ?? 0) > 0
    ? { label: syncing ? 'Sincronizando…' : `${pending} pendente${pending! > 1 ? 's' : ''}`, icon: RefreshCw, cls: 'bg-accent/15 text-accent border-accent/30' }
    : { label: 'Sincronizado', icon: Wifi, cls: 'bg-success/15 text-success border-success/30' };

  const Icon = status.icon;
  return (
    <div className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold', status.cls)}>
      <Icon className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
      <span>{status.label}</span>
      {!online && <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse-dot" />}
    </div>
  );
}
