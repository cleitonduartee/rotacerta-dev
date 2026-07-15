## Nova área: Manutenções

### 1. Banco (Lovable Cloud + IndexedDB)
**Nova tabela `maintenances`** no Cloud + Dexie local (com sync padrão do app):
- `truck_id` (FK trucks)
- `tipo` (enum como texto): `oleo_motor`, `oleo_cambio`, `oleo_diferencial`, `revisao_cubo`, `troca_pneu`, `lona_freio`, `campana`, `outro`
- `tipo_outro` (texto livre, obrigatório quando tipo=`outro`)
- `km` (inteiro — km atual do caminhão no momento)
- `data` (date — padrão `now()`, editável)
- `observacao` (texto opcional)
- Campos padrão: `id`, `user_id`, `created_at`, `updated_at`
- RLS por `user_id` + GRANTs para `authenticated` e `service_role`.

### 2. Frontend
**`src/lib/db.ts`**: adicionar interface `Maintenance` + store Dexie v4 com índices `truckId, data, tipo, syncStatus, remoteId`.

**`src/lib/sync.ts`**: incluir `maintenances` no push/pull (mesmo padrão dos outros).

**`src/pages/MaintenancePage.tsx`** (nova):
- Header padrão `PageHeader`.
- Botão "Nova manutenção" abre form (modal ou rota `/manutencoes/nova`).
- Form:
  - Select Caminhão (lista de `trucks`).
  - Select Tipo com as opções fixas em português. Se "Troca de óleo" → segundo select com Motor / Câmbio / Diferencial. Se "Outro" → input texto obrigatório.
  - Input Data (DatePicker já existente, default hoje).
  - Input KM atual (numérico, obrigatório).
  - Textarea Observação (opcional).
- Listagem abaixo: card por manutenção mostrando placa, tipo formatado, data (dd/MM/yyyy), km e observação. Ordenada por data desc. Filtro rápido por caminhão.
- Ações: editar/excluir com `deleteWithTombstone`.

**`src/App.tsx`**: rota `/manutencoes`.

**`src/components/AppLayout.tsx`**: adicionar item "Manutenção" (ícone `Wrench` do lucide) nas tabs mobile e sidebar desktop. Como já são 5 abas no mobile, vou substituir "Cadastros" por um grupo? Não — para preservar UX, mantenho 5 abas no mobile e adiciono "Manutenção" apenas na sidebar desktop + dentro da página Cadastros como atalho visível, OU trocar tab bar para 6 colunas. **Decisão**: aumentar para 6 colunas no mobile (grid-cols-6, ícones um pouco menores) — assim fica acessível em ambos.

### 3. Formatação
`src/lib/format.ts`: helper `formatMaintenanceType(tipo, tipoOutro?)` → "Troca de óleo (motor)", etc.

### Fora do escopo (não vou fazer)
- Alertas por km/intervalo — não pedido.
- Vínculo com despesas — não pedido.
- Relatório de manutenções — não pedido.

Prossigo com essa estrutura?
