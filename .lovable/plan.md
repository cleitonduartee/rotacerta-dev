
# Tornar o RotaSafra responsivo (mobile + PWA + desktop)

## Diagnóstico

Hoje o app força `max-w-md` (384px) em TODO lugar — no celular fica ótimo, mas em tablet/desktop aparece uma "coluna estreita" no centro da tela com enormes bordas vazias. O layout é inteiramente mobile-first:

- `AppLayout` limita container a `max-w-md` e usa barra de navegação fixa no rodapé (padrão mobile).
- `LoginPage` também fica travado em `max-w-md`.
- `Dashboard`, listas (Viagens, Despesas, Cadastros, Contratos, Safras) e formulários usam grids de 1–2 colunas, pensados para celular.
- FAB flutuante de "Nova viagem" fica centralizado na coluna estreita.

A meta é: **celular/PWA continua idêntico** (nada muda até 768px); **tablet (≥768px) e desktop (≥1024px)** ganham layout expandido, aproveitando a tela.

## O que vai mudar

### 1. Shell do app (`src/components/AppLayout.tsx`)

Transformar em layout adaptativo por breakpoint:

- **Mobile (<768px)** — mantém tudo como está: header, conteúdo em coluna `max-w-md`, tab bar fixa no rodapé e FAB flutuante.
- **Tablet/Desktop (≥768px)** — vira layout com **sidebar lateral esquerda** (240–280px) com logo, navegação (as mesmas 5 abas em coluna vertical) e rodapé com créditos; conteúdo principal ocupa o restante até no máximo ~1280px; header fica fixo no topo do conteúdo com SyncIndicator, Ajuda e Sair; tab bar inferior e FAB escondidos (o "Nova viagem" vira botão no sidebar / header).

```text
Mobile                     Desktop
┌──────────────┐           ┌─────────┬──────────────────────┐
│  header      │           │         │  header              │
├──────────────┤           │ sidebar ├──────────────────────┤
│  conteúdo    │           │  logo   │                      │
│  (max-w-md)  │           │  abas   │  conteúdo            │
│              │           │         │  (max-w-6xl)         │
│   [FAB+]     │           │ + Nova  │                      │
├──────────────┤           │ rodapé  │                      │
│  tab bar     │           │         │                      │
└──────────────┘           └─────────┴──────────────────────┘
```

Implementação: usar classes Tailwind responsivas (`md:` / `lg:`) no mesmo componente — sem duplicar. Sidebar: `hidden md:flex`. Tab bar + FAB: `md:hidden`. Container do conteúdo: `max-w-md mx-auto md:max-w-5xl lg:max-w-6xl`.

### 2. Login (`src/pages/LoginPage.tsx`)

Manter o card centralizado, mas em desktop virar um **split-screen**:

- Esquerda (≥lg): painel com gradient-primary, logo grande, slogan e ilustração do ícone de caminhão — puramente decorativo.
- Direita: o card de login atual (já funciona bem), centralizado verticalmente.
- Mobile: idêntico ao atual (coluna única `max-w-md`).

### 3. Dashboard (`src/pages/Dashboard.tsx`)

- Hero (card de Líquido) ocupa largura total no mobile; em desktop fica no topo em largura cheia.
- Filtros de período: mobile = grid atual; desktop = linha única.
- Stats (Viagens/Sacos): `grid-cols-2` no mobile → `md:grid-cols-4` (para acomodar mais cards futuros).
- Gráficos: hoje stackados um abaixo do outro. Em desktop: `md:grid-cols-2 gap-4` — dois gráficos por linha.

### 4. Listas (Viagens, Despesas, Contratos, Safras, Cadastros)

- Mobile: cards em coluna única (como está).
- Tablet: `md:grid-cols-2`.
- Desktop: `lg:grid-cols-3` para listas de itens pequenos (viagens/despesas/contratos).

### 5. Formulários (`TripForm`, cadastros)

- Mobile: campos empilhados (como está).
- Desktop: agrupar campos relacionados em `md:grid-cols-2` (ex.: origem/destino lado a lado, placa/motorista lado a lado).
- Modais/drawers já usam `max-w-md`; ampliar para `sm:max-w-lg md:max-w-2xl` quando contêm muitos campos.

### 6. Centro de Ajuda e Tour

- `HelpCenter.tsx`: sheet lateral já usa `max-w-md` — aumentar para `md:max-w-xl`.
- `OnboardingTour.tsx`: o cálculo de posicionamento do tooltip já usa `window.innerWidth` e se adapta. Validar que o spotlight continua correto quando o alvo está na sidebar (desktop). Ajustar `TOUR_STEPS` se algum seletor precisar mudar entre mobile (tab bar) e desktop (sidebar).

### 7. Relatórios impressos

Já têm `@media print` dedicado — não mudam.

## Detalhes técnicos

- **Breakpoints usados**: `md` = 768px (tablet), `lg` = 1024px (desktop). Sem breakpoints customizados.
- **Estratégia**: mobile-first, aditiva com classes responsivas. **Nenhum arquivo novo**, só edição dos existentes.
- **Navegação**: um único componente de lista de abas é renderizado de duas formas (horizontal no rodapé mobile, vertical no sidebar desktop) reutilizando o array `tabs` já existente.
- **FAB "Nova viagem"**: escondido em `md:` e substituído por um botão sólido "Nova viagem" dentro do sidebar, acima das abas.
- **`data-tour` attributes**: mantidos nos mesmos elementos. Como em desktop as abas viram sidebar, os mesmos atributos funcionam — só muda a posição visual, e o `OnboardingTour` já calcula com base no `getBoundingClientRect`.
- **Safe areas** (`safe-top`, `safe-bottom`): continuam aplicadas no mobile; no desktop tornam-se no-op (sem impacto).
- **PWA standalone**: o manifest já tem `display: standalone`; a responsividade não afeta isso — o mesmo build funciona instalado no celular e em janela redimensionável no desktop.

## Arquivos afetados

1. `src/components/AppLayout.tsx` — shell adaptativo (principal mudança)
2. `src/pages/LoginPage.tsx` — split-screen no desktop
3. `src/pages/Dashboard.tsx` — grid de gráficos em desktop
4. `src/pages/TripsList.tsx` — grid de cards responsivo
5. `src/pages/Expenses.tsx` — idem
6. `src/pages/ContractsPage.tsx` — idem
7. `src/pages/HarvestsList.tsx` — idem
8. `src/pages/CadastrosPage.tsx` — idem
9. `src/pages/TripForm.tsx` — campos em 2 colunas em desktop
10. `src/components/HelpCenter.tsx` — sheet mais largo em desktop
11. `src/components/PageHeader.tsx` — pequeno ajuste de padding em desktop

## Fora de escopo

- Não vou mexer em cores, fontes, animações, logos, slogan ou nomes — só layout e tamanhos.
- Não vou criar nova tela nem mudar fluxos.
- Não vou tocar em lógica de sync/DB/auth.

## Resultado esperado

- Celular e PWA instalado no celular: **exatamente como hoje** (nenhuma regressão visual abaixo de 768px).
- Tablet na horizontal: aproveita a largura, gráficos em 2 colunas, sidebar aparece.
- Desktop (Chrome/Edge/Firefox em 1280px+): visual tipo app web profissional, sidebar à esquerda, conteúdo centralizado até 1280px, sem mais a "coluna magrinha" no meio da tela.
