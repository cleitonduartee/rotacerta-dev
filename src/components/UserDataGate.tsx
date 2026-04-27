import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';

const KEY = 'rotacerta:lastUserId';
const WIPE_KEY = 'rotacerta:wipedV3';

/**
 * Garante isolamento de dados locais por usuário:
 * - apaga o IndexedDB se o usuário trocou
 * - faz um wipe único na primeira execução (limpeza de dados antigos)
 */
export function UserDataGate() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) { setReady(true); return; }
      try {
        const last = localStorage.getItem(KEY);
        const wiped = localStorage.getItem(WIPE_KEY);
        if (last !== user.id || !wiped) {
          await Promise.all([
            db.trips.clear(),
            db.expenses.clear(),
            db.harvests.clear(),
            db.contracts.clear(),
            db.trucks.clear(),
            db.producers.clear(),
            db.drivers.clear(),
          ]);
          localStorage.setItem(KEY, user.id);
          localStorage.setItem(WIPE_KEY, '1');
        }
      } catch (e) {
        // não bloqueia o app se Dexie falhar (ex: storage cheio / modo privado)
        console.warn('UserDataGate wipe falhou', e);
      }
      setReady(true);
    })();
  }, [user?.id]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Preparando seus dados...</p>
      </div>
    );
  }
  return <Outlet />;
}
