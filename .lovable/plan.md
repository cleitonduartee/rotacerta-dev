# Atualizar print da tela de Cadastros no manual PDF

Apenas a imagem `src/assets/guide/cadastros.png` será trocada. Nenhum outro print, texto ou layout do PDF será alterado.

## Passo a passo

1. **Login no preview com a sua conta** (você já estará logado — eu apenas navego pela tela). Se preferir uma conta limpa, me avise antes.
2. **Abrir a tela de Cadastros** (`/cadastros`) na seção "Seus dados" e **substituir temporariamente os campos visíveis** por dados fictícios via DOM, somente para a captura:
   - Nome: **João da Silva**
   - CPF: **123.456.789-00**
   - Telefone: **(11) 98765-4321**
   - E-mail: **joao.silva@exemplo.com**
   
   A alteração é feita só no DOM renderizado (não salva no banco), exclusivamente para o screenshot.
3. **Capturar a tela** no mesmo viewport mobile usado nos outros prints, para manter consistência visual.
4. **Salvar como** `src/assets/guide/cadastros.png` (sobrescreve o atual). Como `guidePdf.ts` já importa esse arquivo, o PDF passa a usar a imagem nova automaticamente — sem mexer no código.
5. **QA**: gerar o PDF, abrir a página de Cadastros e conferir visualmente que (a) os dados fictícios aparecem corretos, (b) a qualidade/recorte está igual aos demais prints, (c) nenhum dado real vazou.

## Confirme antes de eu executar

- Os dados fictícios acima estão bons? Se quiser outros (ex: outro nome/email), me diga agora.
- Posso usar sua sessão atual já logada no preview, ou prefere que eu use outra conta?
