## Objetivo

A safra deixa de ter status "Aberta/Fechada". Ela passa a ser apenas um rótulo do período de plantio (ex.: "Soja 2026"). O fechamento continua exclusivo dos **contratos** dentro da safra, como já é feito hoje na página Contratos.

## Por que mexer em mais de um arquivo

O conceito de "safra fechada" já estava sendo descontinuado (a própria tela `HarvestDetail` informa: *"O fechamento agora é feito por contrato"*), mas restaram resíduos visuais e regras zumbis espalhadas pelo app que precisam sair juntas para não confundir.

## O que muda na interface

1. **Listagem de Safras** (`HarvestsList.tsx`) — remover o badge verde/cinza "Aberta/Fechada" ao lado do nome da safra.
2. **Cadastros → aba Safras** (`CadastrosPage.tsx`) — remover o mesmo badge "Aberta/Fechada".
3. **Detalhe da Safra** (`HarvestDetail.tsx`) — remover o aviso *"O fechamento agora é feito por contrato…"*, que não faz mais sentido sem o conceito de safra fechada.
4. **Cadastrar Viagem** (`TripForm.tsx`):
   - Remover o sufixo " — fechada" no `<select>` de safra.
   - Remover a trava que bloqueia salvar viagem quando a safra está marcada como fechada (essa regra agora vive só no contrato).
5. **Início (Dashboard)** — remover o KPI "Safras abertas", que ficou sem significado (sempre conta todas).

## O que muda no código (detalhes técnicos)

- O campo `fechada` / `fechada_em` na tabela `harvests` **permanece no banco** por compatibilidade e sincronização com instalações antigas — só deixa de ser lido/exibido na UI. Não vamos rodar migração para apagar coluna agora (evita risco em quem tem dados locais com a flag setada).
- Em `db.ts`, mantém o tipo `fechada?: boolean` como opcional/legado (sem remover, para não quebrar o schema do Dexie já instalado nos PWAs dos usuários).
- `sync.ts` continua espelhando o campo normalmente.

## Arquivos afetados

- `src/pages/HarvestsList.tsx` — remove badge.
- `src/pages/CadastrosPage.tsx` — remove badge na aba Safras.
- `src/pages/HarvestDetail.tsx` — remove aviso de fechamento por contrato.
- `src/pages/TripForm.tsx` — remove sufixo "— fechada" e a validação `harvestFechada`.
- `src/pages/Dashboard.tsx` — remove KPI "Safras abertas" (e ajusta o grid de stats se necessário para manter alinhamento).

## Fora do escopo

- Não mexe em **Contratos** — fechar/reabrir contrato continua igual.
- Não remove colunas no banco nem no IndexedDB.
- Não altera relatórios/PDF.
