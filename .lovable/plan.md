# Renomear gráfico "Receita por Safra"

## Mudança
**Arquivo:** `src/pages/Dashboard.tsx` (linha 236)

Trocar o título do `ChartCard`:
- De: `"Receita por Safra"`
- Para: `"Receita por Tipo de Frete"`

O gráfico continua mostrando uma fatia por safra (para viagens vinculadas a contratos) e uma fatia "Fretes avulsos" para o restante. Nenhuma alteração na lógica de cálculo (`pizzaSafra`).

## Fora de escopo
- Lógica do gráfico.
- Outros relatórios (`ReportsPage.tsx`).
