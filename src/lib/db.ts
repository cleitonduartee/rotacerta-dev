import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'pending' | 'synced';

export interface Driver {
  id?: number;
  nome: string;
  cpf?: string;
  telefone?: string;
}

export interface Truck {
  id?: number;
  placa: string;
  modelo?: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Producer {
  id?: number;
  nome: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Harvest {
  id?: number;
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

  valorTotal: number;
  observacao?: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Expense {
  id?: number;
  data: string;
  tipo: string;
  valor: number;
  descricao?: string;
  harvestId?: number;
  tripId?: number;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
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

  constructor() {
    super('rotacerta');
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
  }
}

export const db = new TruckTripDB();

export const stamp = () => ({ syncStatus: 'pending' as SyncStatus, updatedAt: Date.now() });

export function calcSafra(pesoKg: number, valorPorSaco: number) {
  const sacos = pesoKg / 60;
  const valorTotal = sacos * valorPorSaco;
  return { sacos, valorTotal };
}

export function calcFrete(pesoToneladas: number, valorPorTonelada: number) {
  return pesoToneladas * valorPorTonelada;
}
