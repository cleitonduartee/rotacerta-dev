## O que será feito

### 1. Nova arte do caminhão com asfalto
Manter exatamente o mesmo caminhão laranja + boneco joia já aprovado, mas agora apoiado sobre um trecho de pista (asfalto cinza com faixa central tracejada amarela/branca). Mantém o estilo cartoon limpo, fundo transparente em volta.

- Gerar nova versão de `public/logo-mark.png` usando o `logo-mark.png` atual como referência (Nano Banana Pro, modelo `google/gemini-3-pro-image-preview`) com a instrução de adicionar uma pista curta sob as rodas, mantendo personagem idêntico e fundo transparente.
- A pista vai ser pequena, só um "chão" sob o caminhão — não ocupa a imagem inteira. Sombra suave embaixo do asfalto pra dar peso.

### 2. Ícone do PWA com caminhão + wordmark "RotaCerta"
Hoje os ícones do PWA (`icon-192.png`, `icon-512.png`) mostram só o caminhão sobre fundo navy. Vou refazer os dois com:

- Fundo navy `#0F1620` (mantém identidade do app).
- Caminhão (versão nova com asfalto) centralizado na metade superior.
- Texto **"RotaCerta"** em Bebas Neue laranja `#F97316` na metade inferior, bem legível mesmo no tamanho 192px.
- Layout pensado pra funcionar como ícone na home do celular **e** como splash screen do PWA — onde o iOS/Android amplia o ícone.
- `favicon.ico` regenerado também (multi-res 16/32/48) — no 16px o texto fica ilegível, então no favicon uso só o caminhão.

### 3. Onde a imagem nova aparece automaticamente
- **Tela de login** (`src/pages/LoginPage.tsx`): já usa `/logo-mark.png` — vai puxar a nova versão com asfalto sem precisar mexer no código. O wordmark "ROTACERTA" abaixo continua igual.
- **Header pós-login** (`src/components/AppLayout.tsx`): mesma coisa — já usa `/logo-mark.png`. Vai mostrar a versão com asfalto em tamanho pequeno (`h-9`).
- **PWA (ícone na home + splash)**: passa a mostrar caminhão + "RotaCerta" juntos, resolvendo a falta de impacto da marca que você apontou.

### Boas práticas aplicadas
- Wordmark fica dentro do **ícone do PWA** (PNG) porque ali não tem como renderizar texto HTML — é a única forma de garantir a marca no splash/home screen do celular.
- Na **tela de login e header** o "RotaCerta" continua como **texto real** (Bebas Neue), preservando acessibilidade e SEO.
- Asfalto pequeno e contido pra não competir com o caminhão nem inflar a imagem visualmente.

## Arquivos tocados

- `public/logo-mark.png` — regenerado com asfalto sob o caminhão, fundo transparente.
- `public/icon-512.png` — regenerado: caminhão+asfalto em cima, "RotaCerta" embaixo, fundo navy.
- `public/icon-192.png` — mesma composição em 192×192.
- `public/favicon.ico` — regenerado multi-res a partir do caminhão (sem texto, ilegível em 16px).

Sem alterações em `.tsx` — login e header já apontam pro `logo-mark.png` e vão atualizar sozinhos.

## Observação importante
Depois de publicar, o ícone antigo do PWA pode continuar aparecendo no celular por causa do cache do sistema operacional. Pra ver o novo ícone + splash com "RotaCerta": **desinstale o PWA e instale de novo**.
