## Melhoria do Dashboard inicial

A tela inicial ganhará uma visão analítica completa, com gráficos interativos e filtros, mantendo o estilo visual atual (cards arredondados, gradiente laranja, tipografia display).

### Nova estrutura da tela `/` (Dashboard)

```text
┌─────────────────────────────────────────┐
│  HERO  •  Líquido total                  │
│  Receita | Despesas | Sacos              │
└─────────────────────────────────────────┘
[ Filtro de período: Mês ▾  |  Ano ▾  |  Tudo ]

┌──────── Cards rápidos (3 col) ────────┐
│ Viagens | Sacos | Safras abertas      │
└────────────────────────────────────────┘

┌── Gráfico 1: Receita x Despesa (Barras) ──┐
│  Últimos 6 meses, lado a lado             │
└────────────────────────────────────────────┘

┌── Gráfico 2: Receita por Safra (Pizza) ──┐
│  Fatia por safra com legenda + %          │
└────────────────────────────────────────────┘

┌── Gráfico 3: Receita por Mês (Linha) ────┐
│  Evolução mensal do ano selecionado       │
└────────────────────────────────────────────┘

┌── Gráfico 4: Despesas por Tipo (Pizza) ──┐
│  Combustível, Pedágio, Manutenção, etc.   │
└────────────────────────────────────────────┘

[ Atalhos rápidos ]   [ Últimas viagens ]
```

### Gráficos planejados (recharts já instalado)

1. **Pizza — Receita por Safra**: agrupa `trips` (kind=safra) por `contract.harvestId` e soma `valorTotal`. Inclui fatia "Fretes avulsos" para viagens não-safra.
2. **Pizza — Despesas por Tipo**: agrupa `expenses` por `tipo`.
3. **Barras — Receita vs Despesa (últimos 6 meses)**: 2 barras por mês.
4. **Linha — Receita mensal do ano**: 12 pontos do ano selecionado.

Todos os gráficos respeitam o filtro de período no topo (Mês / Ano / Tudo). Quando o usuário escolher "Mês", os gráficos de evolução mostram o contexto do ano daquele mês.

### Filtros

- Seletor compacto no topo: **Mês** (input month), **Ano** (select), **Tudo**.
- Os 3 cards do hero (Receita/Despesas/Líquido) e os cards rápidos passam a refletir o filtro selecionado.
- Estado local com `useState`, sem persistência.

### Estado vazio

- Quando não houver dados suficientes para um gráfico, mostrar um placeholder discreto ("Sem dados no período") em vez de gráfico vazio, mantendo o card visível.

### Detalhes técnicos

- Arquivo alterado: `src/pages/Dashboard.tsx` (refatoração).
- Uso dos componentes: `PieChart`, `Pie`, `Cell`, `BarChart`, `Bar`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ResponsiveContainer` do `recharts`, envolvidos no `ChartContainer` de `src/components/ui/chart.tsx` para herdar o tema.
- Paleta usando tokens já existentes (`hsl(var(--primary))`, variações) — sem cores hard-coded fora do design system. Para múltiplas fatias da pizza, gerar variações de matiz a partir do primary (laranja → âmbar → terracota → marrom).
- Agregações em `useMemo` para performance, alimentadas por `useLiveQuery` em `db.trips`, `db.expenses`, `db.harvests`, `db.contracts`.
- Formatação monetária com `fmtBRL` em tooltips e labels.
- Sem alterações em banco, rotas, autenticação ou outras páginas.
- Layout responsivo mobile-first (viewport atual 647px): gráficos em coluna única, altura ~220px cada; em telas maiores (`md:`), pizzas lado a lado em 2 colunas.

### Fora de escopo

- Não altera o `ReportsPage` (relatórios para impressão continuam como estão).
- Não cria novas tabelas nem edge functions.
- Não mexe no menu/rodapé/marca d'água.