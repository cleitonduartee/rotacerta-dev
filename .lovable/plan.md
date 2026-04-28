## Plano

Duas melhorias na tela de Login / identidade visual do app.

### 1. Botão de copiar código de verificação

Na tela "Código de verificação" (modo teste), o código aparece dentro de uma caixa (`DevCodeBox`) e hoje precisa ser selecionado manualmente para copiar. Vou adicionar um botão de cópia ao lado do código.

**Arquivo:** `src/pages/LoginPage.tsx` — componente `DevCodeBox` (linhas 324–331).

Mudanças:
- Layout em flex: código à esquerda, botão de ícone à direita.
- Botão usa o ícone `Copy` (já importado), troca para `Check` por ~2s após copiar.
- Ao clicar: `navigator.clipboard.writeText(code)` + toast "Código copiado".
- Estilo coerente com o sistema (borda primária, hover sutil, área de toque adequada para mobile).
- O mesmo `DevCodeBox` já é usado também no fluxo de recuperação ("Troquei meu número"), então a melhoria se aplica em todos os lugares automaticamente.

### 2. Caminhão truck (2 eixos atrás) no ícone do app

Hoje o ícone do app (`public/icon-192.png`, `public/icon-512.png` e `public/favicon.ico`) é um caminhão simples com 1 roda na frente e 1 roda atrás. Esses arquivos formam a imagem que aparece como splash/loading do PWA quando o sistema está abrindo a tela de login.

Vou redesenhar o caminhão como **truck (2 eixos traseiros — roda dianteira sob o capô + duas rodas traseiras lado a lado)**, mantendo:
- Paleta atual do sistema (laranja `#F97316` primário, fundo escuro `#0F1620`).
- Mesma silhueta geral (cabine + carroceria) para preservar reconhecimento.
- Estilo flat / sólido legível em tamanhos pequenos (favicon 32px) e grandes (512px).

**Como será feito (lado técnico):**
1. Criar um SVG do caminhão truck com cabine, capô, baú/carroceria e 3 rodas (1 dianteira + 2 traseiras agrupadas próximas formando o segundo eixo).
2. Renderizar esse SVG em PNG nos tamanhos 192×192 e 512×512 (com `purpose: any maskable` — área segura central) e gerar o `favicon.ico` multi-resolução (16, 32, 48).
3. Substituir os arquivos:
   - `public/icon-192.png`
   - `public/icon-512.png`
   - `public/favicon.ico`
4. Não é preciso alterar `manifest.webmanifest` nem `index.html` (os caminhos continuam os mesmos).

### Resumo de arquivos tocados

- `src/pages/LoginPage.tsx` — botão de copiar no `DevCodeBox`.
- `public/icon-192.png` — novo caminhão truck.
- `public/icon-512.png` — novo caminhão truck.
- `public/favicon.ico` — novo caminhão truck.