## Contexto

No domínio do negócio:
- **Safra** = período/cultura macro (ex.: Safra 2026 — Soja). É um cadastro com nome, ano e tipo. **Permanece como está** em "Cadastros" e em "Contratos de safra".
- **Lavoura** = o frete vinculado a um contrato de produtor dentro daquela safra. Hoje no sistema isso é o **tipo de viagem "Safra"** — esse rótulo passa a ser **"Lavoura"**.

Apenas rótulos visuais mudam. O campo interno `kind: 'safra' | 'frete'` no banco/Dexie permanece igual para não quebrar dados existentes nem exigir migração.

## Mudanças por tela

### 1. Lançamento de viagem (`src/pages/TripForm.tsx`)
- Botão de tipo: `"Safra"` → **`"Lavoura"`** (o outro continua "Frete avulso").
- Mensagens de validação:
  - `"Cadastre um contrato para este produtor + safra"` → `"Cadastre um contrato para este produtor + lavoura"` *(mantém referência clara ao contrato)*.
  - `"Safra fechada — não é possível cadastrar viagens"` → manter (safra como entidade ainda existe).
- Texto auxiliar `"Sem contrato para este produtor nesta safra."` → `"Sem contrato deste produtor para esta safra."` (mantém safra; é a entidade do cadastro).
- O seletor `<Field label="Safra">` (escolher safra do contrato) **permanece "Safra"** — é a entidade real.

### 2. Lista de viagens (`src/pages/TripsList.tsx`)
- Badge do tipo da viagem: quando `t.kind === 'safra'` exibir **`LAVOURA`** em vez de `SAFRA`.

### 3. Dashboard (`src/pages/Dashboard.tsx`)
- Card pizza atualmente intitulado **"Receita por Tipo de Frete"** → renomear para **"Receita por Tipo de Frete"** (já está correto) e ajustar a **legenda das fatias**:
  - Hoje: cada fatia usa o nome da safra (ex.: "Safra 2026") + uma fatia "Fretes avulsos".
  - Passa a usar: `"Lavoura — <nome da safra>"` (ex.: `"Lavoura — Safra 2026"`) + `"Fretes avulsos"`.
- Item da lista de últimas viagens: `t.kind === 'safra' ? 'Safra' : 'Frete avulso'` → `'Lavoura' : 'Frete avulso'`.
- O Stat "Safras abertas" **permanece** (refere-se à entidade safra).

### 4. Relatórios (`src/pages/ReportsPage.tsx`)
- Coluna "Tipo" da tabela de viagens: `'Safra'` → **`'Lavoura'`**.
- O **modo de filtro "Safra"** (botão com ícone Wheat) **permanece "Safra"** — filtra por safra (entidade), exibindo todas as lavouras daquela safra. Faz sentido manter para coerência com o cadastro.

## Fora de escopo
- Não alterar schema do banco nem o tipo `TripKind` (continua `'safra' | 'frete'`).
- Não renomear a entidade Safra em Cadastros, Contratos, HarvestsList, HarvestDetail nem o PDF de fechamento.
- Lógica de cálculo do dashboard e relatórios permanece idêntica.

## Resumo dos arquivos editados
- `src/pages/TripForm.tsx` — rótulos do seletor de tipo e mensagens.
- `src/pages/TripsList.tsx` — badge do tipo.
- `src/pages/Dashboard.tsx` — legendas da pizza e label da lista de últimas viagens.
- `src/pages/ReportsPage.tsx` — coluna Tipo na tabela.
