## Sincronização offline-first IndexedDB ↔ Supabase

Hoje os dados ficam **só** no IndexedDB do navegador — `src/lib/sync.ts` é um stub que apenas marca como "sincronizado". Vou substituí-lo por sincronização real bidirecional com o Lovable Cloud, isolada por `user_id`.

### Modelo de dados — chave dupla local/servidor

Servidor usa `uuid` (string). IndexedDB usa `id` numérico auto-incremento. Solução: cada tabela local ganha uma coluna `remoteId?: string` (uuid do servidor) e mantém o `id` numérico local. A versão do Dexie sobe para `3`, com índices em `remoteId` e `syncStatus`.

Tabelas afetadas no IndexedDB: `trucks`, `producers`, `harvests`, `contracts`, `trips`, `expenses` (drivers continua só local — não tem tabela no servidor).

Campos `*Id` numéricos que apontam para outra tabela local (ex.: `Trip.contractId`, `Trip.truckId`, `Contract.producerId`, `Contract.harvestId`, `Expense.contractId/harvestId/tripId`) **continuam locais**. Na hora de subir/baixar, são traduzidos para `remoteId` correspondente via mapas `localId ↔ remoteId`.

### Fluxo no login (PULL inicial)

Quando `auth` confirma um usuário e o `UserDataGate` termina:

1. Se online, dispara `pullAll(userId)`:
   - Para cada tabela, faz `select('*').eq('user_id', uid)` no Supabase.
   - **Estratégia "last-write-wins"** por `updated_at`:
     - Se o registro local com mesmo `remoteId` é mais novo → mantém local (será reenviado no push).
     - Caso contrário → grava localmente como `synced` com `remoteId` preenchido.
   - Constrói os mapas `remoteId → localId` por tabela e converte FKs antes de gravar (ex.: o `contract_id` uuid vira `contractId` numérico local).
2. Em seguida, `pushAll(userId)` envia tudo que ficou `pending` (registros criados/editados offline antes de logar).

### Fluxo contínuo (PUSH)

Sempre que o app fica online ou o contador de pendentes muda (já existe `SyncIndicator`), chama `pushAll(userId)`:

- Para cada registro `pending`, em ordem de dependência (`trucks`, `producers`, `harvests` → `contracts` → `trips` → `expenses`):
  - Converte campos locais para o payload do servidor (snake_case + tradução de FKs locais para `remoteId`).
  - Se não tem `remoteId` → `insert(...).select().single()` e grava o `id` retornado em `remoteId`.
  - Se tem `remoteId` → `upsert` com o mesmo `id`.
  - Em sucesso, marca como `synced`.
- DELETE: adiciona uma nova tabela local `tombstones { id, table, remoteId, createdAt }`. Sempre que algo é apagado localmente que tinha `remoteId`, grava um tombstone; o push chama `delete().eq('id', remoteId)` e remove o tombstone.

### Realtime (opcional, leve)

Assina canal `postgres_changes` no schema `public` filtrado por `user_id` para refletir alterações feitas em outro dispositivo enquanto o app está aberto. Aplica o mesmo merge "last-write-wins" do pull.

### Mudanças no `UserDataGate`

Hoje ele **apaga o IndexedDB** quando o `user.id` muda. Vamos ajustar:
- Continua isolando por usuário (apaga ao trocar de conta).
- **Para o mesmo usuário, NÃO apaga mais** se já houver `remoteId` nos dados (significa que estão sincronizados). Caso contrário, mantém comportamento atual.
- Após preparar dados, dispara o `pullAll` antes de liberar o `Outlet`, mostrando "Carregando seus dados…".

### Conversões cliente → servidor (exemplo `trips`)

| Local                 | Servidor               |
|-----------------------|------------------------|
| `data` (ISO date)     | `data`                 |
| `kind`                | `kind`                 |
| `truckId` (number)    | `truck_id` (uuid via mapa)  |
| `contractId` (number) | `contract_id` (uuid via mapa) |
| `pesoKg`              | `peso_kg`              |
| `sacos`               | `sacos`                |
| `valorPorSacoOverride`| `valor_por_saco_override` |
| `transportadora`      | `transportadora`       |
| `pesoToneladas`       | `peso_toneladas`       |
| `valorPorTonelada`    | `valor_por_tonelada`   |
| `origem`/`destino`    | `origem`/`destino`     |
| `valorTotal`          | `valor_total`          |
| `observacao`          | `observacao`           |
| `updatedAt` (ms epoch)| `updated_at` (ISO)     |

Mesma lógica para as outras tabelas. `notaProdutor` fica local (não existe coluna no servidor — pode virar um próximo passo).

### Arquivos a alterar/criar

- `src/lib/db.ts` — sobe versão para `3`, adiciona `remoteId` em todas as tabelas sincronizáveis e nova tabela `tombstones`. Migração v2→v3 mantém os dados existentes.
- `src/lib/sync.ts` — reescrita completa: `pullAll`, `pushAll`, `syncAll`, `deleteWithTombstone`, mapeadores por tabela.
- `src/components/UserDataGate.tsx` — chama `pullAll` no login; só apaga IndexedDB ao trocar de conta.
- `src/components/SyncIndicator.tsx` — passa a chamar `syncAll(userId)` em vez de `syncPending`; adiciona toast no sucesso/erro.
- Páginas que fazem `db.<tabela>.delete(id)` (ex.: `TripsList`, `Expenses`, `CadastrosPage`, `ContractsPage`) — trocar para um helper `deleteWithTombstone('trips', id)` para que o servidor também apague.

### Estado vazio e UX

- Loader "Sincronizando seus dados…" no primeiro pull.
- `SyncIndicator` continua mostrando offline / pendentes / sincronizado, agora refletindo o servidor de verdade.
- Em caso de erro de rede, log no console e o app continua usando o IndexedDB normalmente; nova tentativa quando voltar a ficar online.

### Fora de escopo

- Não adicionar `nota_produtor`, `drivers` ou outras colunas ainda inexistentes no servidor (pode virar tarefa separada).
- Não criar tabelas, índices ou triggers no Supabase — o esquema atual já cobre tudo que o app usa.
- Não migrar dados antigos de outros aparelhos (é impossível: nunca foram enviados).