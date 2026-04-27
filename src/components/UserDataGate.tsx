import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { syncAll } from '@/lib/sync';

const KEY = 'rotacerta:lastUserId';

/**
 * Garante isolamento de dados locais por usuário e dispara o pull inicial.
 *  - Se o usuário trocou: apaga o IndexedDB local antes de puxar do servidor.
 *  - Em todo login: faz syncAll (push pendentes + pull do servidor).
 */
export function UserDataGate() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<'init' | 'sync'>('init');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setReady(true); return; }
      setReady(false);
      setPhase('init');
      try {
        const last = localStorage.getItem(KEY);
        if (last && last !== user.id) {
          // Trocou de conta — limpa tudo para isolar dados
          await Promise.all([
            db.trips.clear(),
            db.expenses.clear(),
            db.harvests.clear(),
            db.contracts.clear(),
            db.trucks.clear(),
            db.producers.clear(),
            db.drivers.clear(),
            db.tombstones.clear(),
          ]);
        }
        localStorage.setItem(KEY, user.id);
      } catch (e) {
        console.warn('UserDataGate isolamento falhou', e);
      }

      // Sincroniza com o servidor (push + pull). Se offline, segue com o cache local.
      if (navigator.onLine) {
        setPhase('sync');
        try { await syncAll(user.id); } catch (e) { console.warn('Sync inicial falhou', e); }
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          {phase === 'sync' ? 'Sincronizando seus dados…' : 'Preparando seus dados…'}
        </p>
      </div>
    );
  }
  return <Outlet />;
}
