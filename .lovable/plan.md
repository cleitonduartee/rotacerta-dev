## O que vai acontecer

Vou **gerar uma prévia** da nova versão do `logo-mark.png` e te mostrar como artefato pra você aprovar visualmente. **Nada será aplicado no projeto ainda.**

Depois que você aprovar, aí sim:
1. Substituo o `public/logo-mark.png` pela versão aprovada.
2. Regenero `public/icon-192.png` e `public/icon-512.png` (caminhão + pista nova em cima, "RotaCerta" embaixo, fundo navy).
3. Regenero o `public/favicon.ico`.

## Nova arte da pista (versão minimalista)

- **Sem asfalto cinza.** Some a faixa cinza pesada que estava embaixo do caminhão.
- **Só linhas brancas** sugerindo a pista — tracejado branco simples no chão, alinhado por baixo das rodas.
- **Linha em curva**: começa reta à direita e faz uma curva suave pra esquerda, acompanhando todas as rodas do caminhão (que está de perfil virado pra esquerda).
- **Sombra leve** sob as rodas pra dar apoio visual.
- **Fundo transparente** em todo o resto da imagem.
- Caminhão e boneco mantidos exatamente iguais ao atual.

## Como vou gerar

- Modelo: `google/gemini-3-pro-image-preview` (Nano Banana Pro).
- Uso o `public/logo-mark.png` atual como referência + instrução: "remover completamente a faixa de asfalto cinza. Manter o caminhão e o personagem idênticos. Adicionar apenas algumas linhas brancas tracejadas no chão sob as rodas, formando uma curva suave da direita pra esquerda. Sombra leve sob o caminhão. Fundo 100% transparente."
- Salvo em `/mnt/documents/logo-mark-preview.png` e te mostro via `<lov-artifact>`.

## Próximo passo

Aprova esse plano que eu gero a prévia. Você olha e me diz **"pode aplicar"** ou pede ajuste (ex.: "linhas mais curtas", "curva mais fechada", "tira a sombra"). Só depois mexo nos arquivos do projeto.
