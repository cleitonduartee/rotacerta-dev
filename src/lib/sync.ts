import { db, type SyncTable, type SyncStatus } from './db';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sincronização bidirecional IndexedDB ↔ Supabase.
 *
 * Estratégia:
 *  - Cada tabela local tem `remoteId` (uuid do servidor) + `id` numérico local.
 *  - Pull traz tudo do servidor para o usuário e faz merge "last-write-wins"
 *    pelo `updated_at`. FKs uuid são traduzidas para `id` numérico local.
 *  - Push envia registros com `syncStatus = 'pending'` em ordem de dependência:
 *    trucks/producers/harvests → contracts → trips → expenses.
 *  - Deletes usam tombstones (ver `deleteWithTombstone` em db.ts).
 */

type IdMap = Map<string, number>; // remoteId -> localId

const ORDER: SyncTable[] = ['trucks', 'producers', 'harvests', 'contracts', 'trips', 'expenses'];

let syncing = false;
const syncErrors: string[] = [];
function recordError(table: string, op: 'insert' | 'update' | 'delete', err: any, payload?: any, localId?: number) {
  const msg = err?.message || err?.error_description || JSON.stringify(err);
  const detail = `[${table} ${op}] ${msg}`;
  console.warn('[sync]', detail, { payload, localId, err });
  syncErrors.push(detail);
}
export function getLastSyncErrors() { return [...syncErrors]; }

// ---------- helpers ----------

const toIso = (ms?: number) => new Date(ms ?? Date.now()).toISOString();
const fromIso = (s?: string | null) => (s ? new Date(s).getTime() : Date.now());

async function buildIdMaps() {
  const [trucks, producers, harvests, contracts, trips] = await Promise.all([
    db.trucks.toArray(),
    db.producers.toArray(),
    db.harvests.toArray(),
    db.contracts.toArray(),
    db.trips.toArray(),
  ]);
  const map = (arr: any[]): IdMap => {
    const m: IdMap = new Map();
    for (const r of arr) if (r.remoteId && r.id != null) m.set(r.remoteId, r.id);
    return m;
  };
  const localToRemote = (arr: any[]) => {
    const m = new Map<number, string>();
    for (const r of arr) if (r.remoteId && r.id != null) m.set(r.id, r.remoteId);
    return m;
  };
  return {
    trucks: map(trucks),
    producers: map(producers),
    harvests: map(harvests),
    contracts: map(contracts),
    trips: map(trips),
    truckLocalToRemote: localToRemote(trucks),
    producerLocalToRemote: localToRemote(producers),
    harvestLocalToRemote: localToRemote(harvests),
    contractLocalToRemote: localToRemote(contracts),
    tripLocalToRemote: localToRemote(trips),
  };
}

// ============================================================
// PULL: servidor → IndexedDB
// ============================================================

async function pullTrucks(uid: string) {
  const { data, error } = await supabase.from('trucks').select('*').eq('user_id', uid);
  if (error) throw error;
  for (const r of data ?? []) {
    const local = await db.trucks.where('remoteId').equals(r.id).first();
    const remoteUpdatedAt = fromIso(r.updated_at);
    if (local && local.updatedAt > remoteUpdatedAt && local.syncStatus === 'pending') continue;
    const payload = {
      remoteId: r.id,
      placa: r.placa,
      modelo: r.modelo ?? undefined,
      syncStatus: 'synced' as SyncStatus,
      updatedAt: remoteUpdatedAt,
    };
    if (local) await db.trucks.update(local.id!, payload);
    else await db.trucks.add(payload as any);
  }
}

async function pullProducers(uid: string) {
  const { data, error } = await supabase.from('producers').select('*').eq('user_id', uid);
  if (error) throw error;
  for (const r of data ?? []) {
    const local = await db.producers.where('remoteId').equals(r.id).first();
    const remoteUpdatedAt = fromIso(r.updated_at);
    if (local && local.updatedAt > remoteUpdatedAt && local.syncStatus === 'pending') continue;
    const payload = {
      remoteId: r.id,
      nome: r.nome,
      syncStatus: 'synced' as SyncStatus,
      updatedAt: remoteUpdatedAt,
    };
    if (local) await db.producers.update(local.id!, payload);
    else await db.producers.add(payload as any);
  }
}

async function pullHarvests(uid: string) {
  const { data, error } = await supabase.from('harvests').select('*').eq('user_id', uid);
  if (error) throw error;
  for (const r of data ?? []) {
    const local = await db.harvests.where('remoteId').equals(r.id).first();
    const remoteUpdatedAt = fromIso(r.updated_at);
    if (local && local.updatedAt > remoteUpdatedAt && local.syncStatus === 'pending') continue;
    const payload = {
      remoteId: r.id,
      nome: r.nome,
      tipo: r.tipo,
      ano: r.ano,
      fechada: r.fechada,
      fechadaEm: r.fechada_em ? fromIso(r.fechada_em) : undefined,
      syncStatus: 'synced' as SyncStatus,
      updatedAt: remoteUpdatedAt,
    };
    if (local) await db.harvests.update(local.id!, payload);
    else await db.harvests.add(payload as any);
  }
}

async function pullContracts(uid: string, maps: Awaited<ReturnType<typeof buildIdMaps>>) {
  const { data, error } = await supabase.from('contracts').select('*').eq('user_id', uid);
  if (error) throw error;
  for (const r of data ?? []) {
    const producerLocal = maps.producers.get(r.producer_id);
    const harvestLocal = maps.harvests.get(r.harvest_id);
    if (producerLocal == null || harvestLocal == null) continue; // dependência ainda não puxada
    const local = await db.contracts.where('remoteId').equals(r.id).first();
    const remoteUpdatedAt = fromIso(r.updated_at);
    if (local && local.updatedAt > remoteUpdatedAt && local.syncStatus === 'pending') continue;
    const payload = {
      remoteId: r.id,
      producerId: producerLocal,
      harvestId: harvestLocal,
      valorPorSaco: Number(r.valor_por_saco),
      fechado: r.fechado,
      fechadoEm: r.fechado_em ? fromIso(r.fechado_em) : undefined,
      syncStatus: 'synced' as SyncStatus,
      updatedAt: remoteUpdatedAt,
    };
    if (local) await db.contracts.update(local.id!, payload);
    else await db.contracts.add(payload as any);
  }
}

async function pullTrips(uid: string, maps: Awaited<ReturnType<typeof buildIdMaps>>) {
  const { data, error } = await supabase.from('trips').select('*').eq('user_id', uid);
  if (error) throw error;
  for (const r of data ?? []) {
    const truckLocal = r.truck_id ? maps.trucks.get(r.truck_id) : undefined;
    const contractLocal = r.contract_id ? maps.contracts.get(r.contract_id) : undefined;
    const local = await db.trips.where('remoteId').equals(r.id).first();
    const remoteUpdatedAt = fromIso(r.updated_at);
    if (local && local.updatedAt > remoteUpdatedAt && local.syncStatus === 'pending') continue;
    const payload: any = {
      remoteId: r.id,
      kind: r.kind,
      data: r.data,
      truckId: truckLocal ?? 0,
      origem: r.origem ?? '',
      destino: r.destino ?? '',
      contractId: contractLocal,
      pesoKg: r.peso_kg != null ? Number(r.peso_kg) : undefined,
      sacos: r.sacos != null ? Number(r.sacos) : undefined,
      valorPorSacoOverride: r.valor_por_saco_override != null ? Number(r.valor_por_saco_override) : undefined,
      transportadora: r.transportadora ?? undefined,
      pesoToneladas: r.peso_toneladas != null ? Number(r.peso_toneladas) : undefined,
      valorPorTonelada: r.valor_por_tonelada != null ? Number(r.valor_por_tonelada) : undefined,
      observacao: r.observacao ?? undefined,
      valorTotal: Number(r.valor_total ?? 0),
      syncStatus: 'synced' as SyncStatus,
      updatedAt: remoteUpdatedAt,
    };
    if (local) await db.trips.update(local.id!, payload);
    else await db.trips.add(payload);
  }
}

async function pullExpenses(uid: string, maps: Awaited<ReturnType<typeof buildIdMaps>>) {
  const { data, error } = await supabase.from('expenses').select('*').eq('user_id', uid);
  if (error) throw error;
  for (const r of data ?? []) {
    const local = await db.expenses.where('remoteId').equals(r.id).first();
    const remoteUpdatedAt = fromIso(r.updated_at);
    if (local && local.updatedAt > remoteUpdatedAt && local.syncStatus === 'pending') continue;
    const payload: any = {
      remoteId: r.id,
      data: r.data,
      tipo: r.tipo,
      valor: Number(r.valor),
      descricao: r.descricao ?? undefined,
      contractId: r.contract_id ? maps.contracts.get(r.contract_id) : undefined,
      harvestId: r.harvest_id ? maps.harvests.get(r.harvest_id) : undefined,
      tripId: r.trip_id ? maps.trips.get(r.trip_id) : undefined,
      syncStatus: 'synced' as SyncStatus,
      updatedAt: remoteUpdatedAt,
    };
    if (local) await db.expenses.update(local.id!, payload);
    else await db.expenses.add(payload);
  }
}

export async function pullAll(uid: string) {
  await pullTrucks(uid);
  await pullProducers(uid);
  await pullHarvests(uid);
  let maps = await buildIdMaps();
  await pullContracts(uid, maps);
  maps = await buildIdMaps();
  await pullTrips(uid, maps);
  maps = await buildIdMaps();
  await pullExpenses(uid, maps);
}

// ============================================================
// PUSH: IndexedDB → servidor
// ============================================================

async function pushTombstones() {
  const tombs = await db.tombstones.toArray();
  for (const t of tombs) {
    const { error } = await supabase.from(t.table).delete().eq('id', t.remoteId);
    if (!error) await db.tombstones.delete(t.id!);
    else recordError(t.table, 'delete', error, { id: t.remoteId });
  }
}

async function pushTable<T extends { id?: number; remoteId?: string; syncStatus: SyncStatus }>(
  table: SyncTable,
  toServer: (row: T) => Record<string, any> | null,
) {
  const t = (db as any)[table] as typeof db.trips;
  const pendentes = await t.where('syncStatus').equals('pending').toArray();
  for (const row of pendentes as unknown as T[]) {
    const payload = toServer(row);
    if (!payload) {
      recordError(table, 'insert', { message: 'dependência local sem remoteId (FK não resolvida ainda)' }, row, row.id);
      continue;
    }
    if (row.remoteId) {
      const { error } = await (supabase.from(table) as any).update(payload).eq('id', row.remoteId);
      if (error) recordError(table, 'update', error, payload, row.id);
      else await (t as any).update(row.id!, { syncStatus: 'synced' });
    } else {
      const { data, error } = await (supabase.from(table) as any).insert(payload).select('id').single();
      if (error) recordError(table, 'insert', error, payload, row.id);
      else if (data) await (t as any).update(row.id!, { remoteId: data.id, syncStatus: 'synced' });
    }
  }
}

export async function pushAll(uid: string) {
  await pushTombstones();
  let maps = await buildIdMaps();

  await pushTable('trucks', (r: any) => ({
    user_id: uid,
    placa: r.placa,
    modelo: r.modelo ?? null,
    updated_at: toIso(r.updatedAt),
  }));

  await pushTable('producers', (r: any) => ({
    user_id: uid,
    nome: r.nome,
    updated_at: toIso(r.updatedAt),
  }));

  await pushTable('harvests', (r: any) => ({
    user_id: uid,
    nome: r.nome,
    tipo: r.tipo,
    ano: r.ano,
    fechada: !!r.fechada,
    fechada_em: r.fechadaEm ? toIso(r.fechadaEm) : null,
    updated_at: toIso(r.updatedAt),
  }));

  // Recarrega mapas: trucks/producers/harvests podem ter ganho remoteId agora
  maps = await buildIdMaps();

  await pushTable('contracts', (r: any) => {
    const producer_id = maps.producerLocalToRemote.get(r.producerId);
    const harvest_id = maps.harvestLocalToRemote.get(r.harvestId);
    if (!producer_id || !harvest_id) return null;
    return {
      user_id: uid,
      producer_id,
      harvest_id,
      valor_por_saco: r.valorPorSaco,
      fechado: !!r.fechado,
      fechado_em: r.fechadoEm ? toIso(r.fechadoEm) : null,
      updated_at: toIso(r.updatedAt),
    };
  });

  maps = await buildIdMaps();

  await pushTable('trips', (r: any) => {
    const truck_id = r.truckId ? maps.truckLocalToRemote.get(r.truckId) : null;
    const contract_id = r.contractId ? maps.contractLocalToRemote.get(r.contractId) : null;
    if (r.truckId && !truck_id) return null;
    if (r.contractId && !contract_id) return null;
    return {
      user_id: uid,
      kind: r.kind,
      data: r.data,
      truck_id: truck_id ?? null,
      contract_id: contract_id ?? null,
      origem: r.origem ?? null,
      destino: r.destino ?? null,
      peso_kg: r.pesoKg ?? null,
      sacos: r.sacos ?? null,
      valor_por_saco_override: r.valorPorSacoOverride ?? null,
      transportadora: r.transportadora ?? null,
      peso_toneladas: r.pesoToneladas ?? null,
      valor_por_tonelada: r.valorPorTonelada ?? null,
      observacao: r.observacao ?? null,
      valor_total: r.valorTotal ?? 0,
      updated_at: toIso(r.updatedAt),
    };
  });

  maps = await buildIdMaps();

  await pushTable('expenses', (r: any) => {
    const contract_id = r.contractId ? maps.contractLocalToRemote.get(r.contractId) : null;
    const harvest_id = r.harvestId ? maps.harvestLocalToRemote.get(r.harvestId) : null;
    const trip_id = r.tripId ? maps.tripLocalToRemote.get(r.tripId) : null;
    if (r.contractId && !contract_id) return null;
    if (r.harvestId && !harvest_id) return null;
    if (r.tripId && !trip_id) return null;
    return {
      user_id: uid,
      data: r.data,
      tipo: r.tipo,
      valor: r.valor,
      descricao: r.descricao ?? null,
      contract_id: contract_id ?? null,
      harvest_id: harvest_id ?? null,
      trip_id: trip_id ?? null,
      updated_at: toIso(r.updatedAt),
    };
  });
}

// ============================================================
// API pública
// ============================================================

export async function syncAll(uid: string) {
  if (syncing) return { ok: true, count: 0, skipped: true, errors: [] as string[] };
  if (!navigator.onLine) return { ok: false, count: 0, errors: [] as string[] };
  syncing = true;
  syncErrors.length = 0;
  try {
    await pushAll(uid);
    await pullAll(uid);
    await pushAll(uid); // 2ª passada caso o pull tenha resolvido dependências
    const errors = [...syncErrors];
    return { ok: errors.length === 0, count: 0, errors };
  } catch (e: any) {
    console.warn('[sync] falhou', e);
    const msg = e?.message || String(e);
    syncErrors.push(`[fatal] ${msg}`);
    return { ok: false, count: 0, error: e, errors: [...syncErrors] };
  } finally {
    syncing = false;
  }
}

/** Mantido por compat (SyncIndicator antigo). Faz só o push. */
export async function syncPending() {
  if (!navigator.onLine) return { ok: false, count: 0 };
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return { ok: false, count: 0 };
  await pushAll(uid);
  return { ok: true, count: 0 };
}

export async function countPending() {
  let total = 0;
  for (const tbl of ORDER) {
    const t = (db as any)[tbl];
    total += await t.where('syncStatus').equals('pending').count();
  }
  total += await db.tombstones.count();
  return total;
}

export type PendingBreakdown = {
  trucks: number;
  producers: number;
  harvests: number;
  contracts: number;
  trips: number;
  expenses: number;
  deletes: number;
  total: number;
};

export async function countPendingByTable(): Promise<PendingBreakdown> {
  const [trucks, producers, harvests, contracts, trips, expenses, deletes] = await Promise.all([
    db.trucks.where('syncStatus').equals('pending').count(),
    db.producers.where('syncStatus').equals('pending').count(),
    db.harvests.where('syncStatus').equals('pending').count(),
    db.contracts.where('syncStatus').equals('pending').count(),
    db.trips.where('syncStatus').equals('pending').count(),
    db.expenses.where('syncStatus').equals('pending').count(),
    db.tombstones.count(),
  ]);
  return {
    trucks, producers, harvests, contracts, trips, expenses, deletes,
    total: trucks + producers + harvests + contracts + trips + expenses + deletes,
  };
}
