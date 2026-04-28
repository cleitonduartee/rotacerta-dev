## O que será feito

### 1. Corrigir ícones quebrados do PWA
Os arquivos `public/icon-192.png` e `public/favicon.ico` estão com 0 bytes (vazios). Só o `icon-512.png` tem a arte nova (carreta + boneco joia).

- Regenerar `public/icon-192.png` (192×192) a partir do `icon-512.png`.
- Regenerar `public/favicon.ico` multi-resolução (16, 32, 48) a partir da mesma arte.
- QA: confirmar que os 3 arquivos têm tamanho > 0 e visualmente mostram o caminhão carreta + boneco joia.

### 2. Criar versão "logo" da imagem
A arte do `icon-512.png` foi feita para ícone de app (fundo escuro sólido, padding grande). Usar ela direto no header fica pesado.

- Gerar `public/logo-mark.png` — variante com **fundo transparente**, ~256×256, sem padding extra.
- Mesma identidade: carreta laranja `#F97316` + boneco joinha.
- Gerada com Nano Banana Pro usando o `icon-512.png` como referência para manter o personagem consistente.

### 3. Logo na tela de Login
Em `src/pages/LoginPage.tsx`:
- Logo `logo-mark.png` **acima** do nome "RotaCerta", composição vertical centralizada.
- Tamanho: `h-16` (64px) mobile, `h-20` (80px) desktop.
- `mb-3` entre logo e wordmark.
- Wordmark "RotaCerta" mantém a tipografia atual.

### 4. Logo pequeno no cabeçalho pós-login
Em `src/components/AppLayout.tsx` (ou onde fica o header global):
- Layout horizontal: `[logo] RotaCerta` lado a lado.
- Tamanho **pequeno**: `h-8` (32px), proporcional à altura do header.
- `gap-2` entre logo e texto.
- Clicável → leva para a home.

### Boas práticas de design aplicadas
- Hierarquia: logo grande no login (momento de marca), pequeno no header (momento de uso).
- Wordmark fica como **texto real** (não imagem) — melhor para acessibilidade e SEO.
- `alt="RotaCerta"` no `<img>`.
- Fundo transparente no logo garante que funciona em qualquer cor de fundo.

## Arquivos tocados

- `public/icon-192.png` — regenerado.
- `public/favicon.ico` — regenerado multi-res.
- `public/logo-mark.png` — **novo**.
- `src/pages/LoginPage.tsx` — logo + wordmark no topo.
- `src/components/AppLayout.tsx` — logo pequeno no header (vou inspecionar primeiro pra confirmar que é esse o arquivo certo do header global).

## Observação para teste no celular
Após o deploy, o ícone do PWA já instalado pode continuar mostrando a versão antiga por causa do cache do sistema. Para ver o ícone novo no celular: **desinstalar o PWA e instalar de novo**.
