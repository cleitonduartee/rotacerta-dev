import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'pending' | 'synced';
export type SyncTable = 'trucks' | 'producers' | 'harvests' | 'contracts' | 'trips' | 'expenses';

export interface Driver {
  id?: number;
  nome: string;
  docType?: 'cpf' | 'cnpj';
  cpf?: string;       // mantido para compat — armazena CPF ou CNPJ formatado
  telefone?: string;
  email?: string;     // opcional, útil para recuperação se trocar de número
}

export interface Truck {
  id?: number;
  remoteId?: string;
  placa: string;
  modelo?: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Producer {
  id?: number;
  remoteId?: string;
  nome: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Harvest {
  id?: number;
  remoteId?: string;
  nome: string;        // ex Safra 2026
  tipo: string;        // soja, milho...
  ano: number;
  fechada?: boolean;
  fechadaEm?: number;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface HarvestContract {
  id?: number;
  remoteId?: string;
  producerId: number;
  harvestId: number;
  valorPorSaco: number;  // R$ por saco de 60kg
  fechado?: boolean;
  fechadoEm?: number;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export type TripKind = 'safra' | 'frete';

export interface Trip {
  id?: number;
  remoteId?: string;
  kind: TripKind;
  data: string;            // ISO date
  truckId: number;
  origem: string;
  destino: string;

  // safra
  contractId?: number;
  pesoKg?: number;          // entrada em kg
  sacos?: number;           // pesoKg/60
  valorPorSacoOverride?: number; // edição manual

  // frete avulso
  transportadora?: string;
  pesoToneladas?: number;
  valorPorTonelada?: number;

  numeroNota?: string;     // número da nota fiscal (produtor para safra, transportadora para frete)
  valorTotal: number;
  observacao?: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Expense {
  id?: number;
  remoteId?: string;
  data: string;
  tipo: string;            // categoria (Combustível, Pedágio, ... ou texto livre se "Outros")
  valor: number;
  descricao?: string;
  contractId?: number;     // vínculo opcional ao contrato (safra)
  harvestId?: number;      // mantido para compat
  tripId?: number;         // vínculo opcional à viagem (frete avulso)
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface Tombstone {
  id?: number;
  table: SyncTable;
  remoteId: string;
  createdAt: number;
}

class TruckTripDB extends Dexie {
  drivers!: Table<Driver, number>;
  trucks!: Table<Truck, number>;
  producers!: Table<Producer, number>;
  harvests!: Table<Harvest, number>;
  contracts!: Table<HarvestContract, number>;
  trips!: Table<Trip, number>;
  expenses!: Table<Expense, number>;
  settings!: Table<Setting, string>;
  tombstones!: Table<Tombstone, number>;

  constructor() {
    super('trucktrip');
    this.version(1).stores({
      drivers: '++id, nome',
      trucks: '++id, placa, syncStatus',
      producers: '++id, nome, syncStatus',
      harvests: '++id, ano, fechada, syncStatus',
      contracts: '++id, producerId, harvestId, syncStatus',
      trips: '++id, data, kind, truckId, contractId, syncStatus',
      expenses: '++id, data, harvestId, tripId, syncStatus',
      settings: 'key',
    });
    this.version(2).stores({
      expenses: '++id, data, harvestId, tripId, contractId, syncStatus',
    });
    // v3: adiciona remoteId em todas as tabelas sincronizáveis + tombstones
    this.version(3).stores({
      trucks: '++id, remoteId, placa, syncStatus',
      producers: '++id, remoteId, nome, syncStatus',
      harvests: '++id, remoteId, ano, fechada, syncStatus',
      contracts: '++id, remoteId, producerId, harvestId, syncStatus',
      trips: '++id, remoteId, data, kind, truckId, contractId, syncStatus',
      expenses: '++id, remoteId, data, harvestId, tripId, contractId, syncStatus',
      tombstones: '++id, table, remoteId',
    });
  }
}

export const db = new TruckTripDB();

export const stamp = () => ({ syncStatus: 'pending' as SyncStatus, updatedAt: Date.now() });
export const LOCAL_RESET_PULL_ONLY_KEY = 'rotasafra:localResetPullOnlyOnce';

export function calcSafra(pesoKg: number, valorPorSaco: number) {
  const sacos = pesoKg / 60;
  const valorTotal = sacos * valorPorSaco;
  return { sacos, valorTotal };
}

export function calcFrete(pesoToneladas: number, valorPorTonelada: number) {
  return pesoToneladas * valorPorTonelada;
}

/**
 * Apaga um registro local e, se ele já existia no servidor,
 * registra um tombstone para que o próximo push remova-o no Cloud também.
 */
export async function deleteWithTombstone(table: SyncTable, localId: number) {
  const t = (db as any)[table] as Table<any, number>;
  const row = await t.get(localId);
  if (!row) return;
  if (row.remoteId) {
    await db.tombstones.add({ table, remoteId: row.remoteId, createdAt: Date.now() });
  }
  await t.delete(localId);
}

/**
 * Limpa TODOS os dados locais de negócio (não apaga login/sessão).
 * Útil para reiniciar testes garantindo paridade com o servidor.
 */
export async function wipeLocalData() {
  await db.transaction(
    'rw',
    db.trucks,
    db.producers,
    db.harvests,
    db.contracts,
    db.trips,
    db.expenses,
    db.tombstones,
    db.drivers,
    async () => {
      await Promise.all([
        db.trucks.clear(),
        db.producers.clear(),
        db.harvests.clear(),
        db.contracts.clear(),
        db.trips.clear(),
        db.expenses.clear(),
        db.tombstones.clear(),
        db.drivers.clear(),
      ]);
    },
  );
}

