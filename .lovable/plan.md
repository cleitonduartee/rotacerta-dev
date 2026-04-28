
# Tutorial de uso dentro do RotaCerta

## Recomendação

Para um app mobile usado por motoristas e produtores no campo, **um único formato não resolve**. Sugiro combinar **3 camadas leves** que se complementam — todas opcionais, sem travar o usuário:

### 1. Tour guiado no primeiro acesso (obrigatório de mostrar, opcional de seguir)
Um walkthrough de **5 a 7 passos** que aparece automaticamente após o primeiro login, destacando elementos reais da tela com um spotlight (overlay escurecido + balão explicativo).

Fluxo sugerido:
1. **Boas-vindas** — "Bem-vindo ao RotaCerta! Vamos te mostrar em 1 minuto."
2. **Cadastros primeiro** — destaca a aba *Cadastros*: "Comece cadastrando produtores, caminhões e safras."
3. **Contratos** — destaca *Contratos*: "Vincule produtor + safra + valor da saca."
4. **Nova viagem** — destaca o botão **+** central: "Toque aqui para registrar cada viagem (lavoura ou frete avulso)."
5. **Despesas** — destaca *Despesas*: "Lance combustível, pedágio, manutenção..."
6. **Dashboard** — destaca os cards de receita/líquido: "Acompanhe tudo em tempo real."
7. **Relatórios e WhatsApp** — "Gere PDFs de fechamento e envie ao produtor pelo WhatsApp."

Botões em cada passo: **Próximo**, **Pular tour**, **Concluir**. Estado salvo em `localStorage` (`rotacerta:tourDone:{userId}`) para não repetir.

### 2. Central de Ajuda permanente (acessível sempre)
Um ícone de **interrogação (?)** no header, ao lado do botão sair, que abre um Sheet lateral com:
- **Refazer tour guiado** (botão grande no topo)
- **Guia rápido** — passo a passo escrito em linguagem simples, dividido por seção (Cadastros, Contratos, Viagens, Despesas, Relatórios)
- **Perguntas frequentes** — accordion com 6-8 dúvidas comuns ("Por que não consigo excluir uma safra?", "Como funciona o modo offline?", "Como envio o fechamento ao produtor?")
- **Sobre o app / versão / contato**

### 3. Dicas contextuais em estados vazios (já existe parcialmente)
O Dashboard já mostra "Nenhuma viagem registrada ainda. Toque no + para começar." — vamos **expandir esse padrão** para todas as listas vazias:
- **Cadastros vazio**: "Cadastre seu primeiro produtor/caminhão/motorista para começar."
- **Contratos vazio**: "Crie um contrato vinculando produtor + safra + valor."
- **Viagens vazio**: card explicando os 2 tipos (Lavoura vs Frete avulso).
- **Despesas vazio**: "Lance custos para calcular seu lucro líquido real."

Cada empty state com ícone + 1 linha de explicação + botão de ação direta.

## Por que esses 3 juntos

| Camada | Quando aparece | Para quem |
|--------|---------------|-----------|
| Tour guiado | 1ª vez (auto) | Usuário novo |
| Central de Ajuda | Sob demanda (sempre) | Quem esqueceu / quer revisar |
| Empty states | Quando lista vazia | Quem está explorando uma seção nova |

Isso cobre todos os perfis sem ser invasivo — quem já sabe usar não é incomodado.

## Detalhes técnicos

- **Tour guiado**: componente próprio `OnboardingTour.tsx` (spotlight com overlay SVG + tooltip posicionado). **Não vou usar bibliotecas externas** (driver.js, intro.js, shepherd) para manter o bundle leve e o visual 100% alinhado ao design system. ~200 linhas de código.
- **Disparo automático**: dentro do `UserDataGate`, após `setReady(true)`, checar `localStorage.getItem('rotacerta:tourDone:' + user.id)` — se ausente, montar `<OnboardingTour />` por cima do app.
- **Targets**: cada passo recebe um seletor CSS (ex: `[data-tour="tab-cadastros"]`) — adiciono atributos `data-tour` nos elementos do `AppLayout` (tabs, FAB, header).
- **Central de Ajuda**: novo componente `HelpCenter.tsx` usando `Sheet` (lateral direito) + `Accordion` para FAQ. Botão `?` adicionado ao header em `AppLayout.tsx`.
- **Empty states**: refatoro os textos existentes nas páginas (`HarvestsList`, `ContractsPage`, `TripsList`, `Expenses`, `CadastrosPage`) para um padrão consistente com ícone + CTA.
- **Reset do tour**: botão "Refazer tour" na Central de Ajuda apaga a flag e reinicia o tour imediatamente.
- **Mobile-first**: todos os tooltips do tour respeitam o viewport de 647px (max-w-md), com setas que se reposicionam para caber.

## Arquivos afetados

- **Novos**: `src/components/OnboardingTour.tsx`, `src/components/HelpCenter.tsx`, `src/lib/tourSteps.ts`
- **Editados**: `src/components/AppLayout.tsx` (botão ?, atributos `data-tour`), `src/components/UserDataGate.tsx` (auto-disparo do tour), `src/pages/HarvestsList.tsx`, `src/pages/ContractsPage.tsx`, `src/pages/TripsList.tsx`, `src/pages/Expenses.tsx`, `src/pages/CadastrosPage.tsx` (empty states padronizados)

## Fora do escopo (posso adicionar depois se quiser)

- Vídeos tutoriais embutidos
- Tour específico por seção (ex: tour só de "como criar contrato")
- Tooltip permanente em ícones (badge "novo")
- Versionamento de tour (mostrar novidades quando atualizar)

---

**Posso seguir com a implementação?** Se quiser, posso também ajustar o número de passos do tour ou trocar a Central de Ajuda por uma página dedicada (`/ajuda`) em vez de um Sheet lateral.
