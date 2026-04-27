import { db } from './db';

/**
 * Stub de sincronização. Quando o backend estiver pronto (Lovable Cloud),
 * basta substituir este arquivo por chamadas reais (POST /sync).
 * Por enquanto: marca como sincronizado quando online após pequeno delay,
 * simulando que o servidor confirmou.
 */
export async function syncPending() {
  if (!navigator.onLine) return { ok: false, count: 0 };

  const tables = [db.trucks, db.producers, db.harvests, db.contracts, db.trips, db.expenses];
  let count = 0;
  for (const t of tables) {
    const pendentes = await t.where('syncStatus').equals('pending').toArray();
    for (const item of pendentes) {
      await t.update((item as any).id, { syncStatus: 'synced' });
      count++;
    }
  }
  return { ok: true, count };
}

export async function countPending() {
  const tables = [db.trucks, db.producers, db.harvests, db.contracts, db.trips, db.expenses];
  let total = 0;
  for (const t of tables) {
    total += await t.where('syncStatus').equals('pending').count();
  }
  return total;
}
