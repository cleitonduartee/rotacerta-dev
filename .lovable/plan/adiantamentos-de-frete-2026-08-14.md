# Adiantamentos de frete

Lançar adiantamentos (valores recebidos antes do fechamento) vinculados a um contrato de lavoura ou a uma viagem avulsa, refletindo em Recebíveis e no relatório de fechamento.

## 1. Dados

Nova tabela `advances` (Cloud + Dexie local, com sync igual às demais):
- `contract_id` (opcional) ou `trip_id` (opcional) — exatamente um preenchido
- `data` (padrão hoje)
- `valor`
- `observacao` (opcional)
- Padrão: `id`, `user_id`, `created_at`, `updated_at`
- RLS por usuário + GRANTs.

## 2. Onde lançar

**No card do contrato (Contratos)**
- Botão "Adiantamento" abre modal: valor, data, observação.
- No card aparece linha "Adiantado: R$ X" quando houver, com acesso à lista (editar/excluir).
- Bloqueio: não permitir excluir contrato que tenha adiantamentos.

**No card da viagem avulsa (Viagens)**
- Mesmo botão/modal para fretes avulsos (`kind = frete`).
- Se a viagem já foi marcada como recebida, o botão fica oculto.

**Página dedicada `/adiantamentos`**
- Item no menu (mobile + desktop), ícone `HandCoins`.
- Formulário: escolher destino (Contrato ou Viagem avulsa) → select do registro → valor, data, observação.
- Histórico ordenado por data desc, com filtro por contrato/viagem e ações editar/excluir.

## 3. Dashboard (Recebíveis)

- "Recebido" passa a somar: valores já recebidos + adiantamentos de contratos/viagens ainda pendentes.
- "A receber (líquido)" passa a descontar também os adiantamentos, além das despesas já abatidas hoje.
- Detalhamento do card mostra: Bruto − Despesas − Adiantamentos.
- Quando o contrato/viagem é marcado como recebido, o adiantamento deixa de ser contado em separado (evita duplicidade).

## 4. Relatório de fechamento (PDF/WhatsApp)

- Nova seção "Adiantamentos" com data, valor e observação de cada lançamento.
- Nos totais: Receita − Despesas − Adiantamentos = **Líquido a pagar**.
- QR Code PIX passa a usar o líquido já descontado dos adiantamentos.

## Detalhes técnicos

- `src/lib/db.ts`: interface `Advance` + store Dexie v6 (`++id, remoteId, contractId, tripId, data, syncStatus`); incluir em `SyncTable` e `wipeLocalData`.
- `src/lib/sync.ts`: push/pull de `advances` no mesmo padrão (tombstones inclusos).
- `src/components/AdvanceDialog.tsx`: modal reutilizável usado em Contratos, Viagens e na página.
- `src/pages/AdvancesPage.tsx` + rota em `src/App.tsx` + item em `src/components/AppLayout.tsx`.
- `src/pages/ContractsPage.tsx`, `src/pages/TripsList.tsx`: botão + resumo.
- `src/pages/Dashboard.tsx`: incluir adiantamentos no bloco de Recebimentos.
- `src/lib/report.ts` (+ `analyticReports.ts` se aplicável): seção e totais.

## Fora do escopo
- Adiantamento parcial por viagem dentro de contrato (fica no nível do contrato).
- Registro de forma de pagamento/comprovante.
