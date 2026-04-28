## Problema

O badge mostra "3 pendentes" e nunca sincroniza, mesmo online. Investigação:

1. **Bug no push de safras (`src/lib/sync.ts`)**: o payload envia `fechado_em`, mas a coluna real na tabela `harvests` é `fechada_em`. O Supabase rejeita com `PGRST204 "Could not find the 'fechado_em' column"`. Resultado: as 3 safras locais ficam para sempre com `syncStatus = 'pending'` e o sistema retenta a cada ciclo, sempre falhando. Confirmado nos network logs (3 POSTs `/harvests` com 400) e no schema do banco.
2. **Indicador opaco**: `SyncIndicator` mostra apenas o número total. O usuário não sabe se são viagens, safras, despesas, etc., nem por que não sincronizou.

## O que será feito

### 1. Corrigir o push de safras
Em `src/lib/sync.ts`, no `pushTable('harvests', ...)`, trocar a chave `fechado_em` por `fechada_em` (alinhar com o nome real da coluna no banco). Após a correção, na próxima tentativa de sync as 3 safras pendentes serão aceitas pelo servidor e marcadas como `synced`.

### 2. Detalhar o indicador de pendências
Trocar `countPending()` por uma função que retorna a contagem por tipo (`{ trucks, producers, harvests, contracts, trips, expenses, deletes }`). O `SyncIndicator` passa a:
- Mostrar o total no badge (como hoje), mas com um tooltip/popover ao clicar/passar o mouse exibindo a quebra: "2 safras, 1 viagem", etc., usando rótulos em português.
- Adicionar um botão "Sincronizar agora" dentro do popover para forçar o `syncAll` manualmente.
- Logar no console um resumo legível em cada tentativa de sync para diagnóstico futuro.

### 3. Melhorar o tratamento de erro no push
Em `pushTable` (sync.ts), quando o insert/update falhar, registrar `console.warn` com tabela, payload e erro. Isso facilita identificar bugs como esse no futuro (hoje o erro é silencioso — a função apenas pula o `update` para `synced`).

## Resultado esperado

- O badge "3 pendentes" desaparece automaticamente assim que a correção entra em produção e o app tentar sincronizar (acontece sozinho ao montar o `SyncIndicator` estando online).
- Ao tocar/passar o mouse no badge, o usuário vê exatamente quais cadastros estão pendentes (ex.: "3 safras pendentes").
- Botão "Sincronizar agora" para forçar manualmente.

## Detalhes técnicos

Arquivos alterados:
- `src/lib/sync.ts`: corrigir `fechado_em` → `fechada_em` no push de harvests; adicionar `countPendingByTable()`; logar erros do push.
- `src/components/SyncIndicator.tsx`: usar `countPendingByTable`, embrulhar em Popover com breakdown e botão de sincronizar.

Sem alterações de schema ou migrations — o banco já tem `fechada_em` correto.
