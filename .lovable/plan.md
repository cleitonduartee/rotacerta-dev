## Diagnóstico

Verifiquei o servidor (Lovable Cloud) e o login `67991568155` (user `144b3229...`) tem **apenas 1 safra** cadastrada: "Soja - 2026", criada hoje às 14:06. Também há 1 produtor, 1 caminhão, 1 contrato e 1 viagem — todos sincronizados corretamente.

### Por que apareceram "3 pendentes" antes?

Os "3 pendentes" que você viu **NÃO eram 3 safras**. Eram 3 registros distintos no IndexedDB (o banco local do navegador) aguardando upload:

1. **1 safra** (Soja - 2026)
2. **1 contrato** (Gustavo × Soja 2026, R$ 2/saco)
3. **1 viagem** (kind=safra, Gleba → Producel, 700 sacos)

Eles estavam travados como `pending` porque o push antigo enviava o campo errado `fechado_em` em vez de `fechada_em` para a tabela `harvests` — isso fazia o insert da safra falhar, e como contrato/viagem dependiam do `remoteId` da safra, eles ficavam em fila também. O contador somava os 3 → "3 pendentes".

Após a correção do bug + a sincronização que rodou agora, os 3 subiram com sucesso. Por isso aparece **só 1 safra** (que é o correto — é o mesmo dado, só estava preso localmente).

### Sobre o PWA do celular

Não foram criadas safras extras no celular. Se tivessem sido criadas e não sincronizado, elas estariam pendentes no IndexedDB do **celular**, não aqui — cada dispositivo tem seu próprio banco local. Quando o celular abrir online, ele vai puxar essa mesma safra "Soja - 2026" do servidor (e mandar qualquer pendência local que tenha).

---

## Plano de limpeza para testes

Você pediu para limpar e poder começar testes do zero garantindo paridade entre dev e celular. Vou:

### 1. Limpar todos os dados do usuário no servidor
Executar DELETE em cascata para o `user_id = 144b3229-c71a-49b1-bc85-dda68eaadf50`:
- `expenses` → `trips` → `contracts` → `harvests` → `producers` → `trucks`

Mantenho `profiles` (cadastro do usuário) intacto para você não precisar refazer login/cadastro.

### 2. Garantir que o cliente local também limpe
No próximo login (ou refresh) o `pullAll` vai trazer o servidor vazio, mas registros locais antigos **não são apagados** automaticamente pelo pull. Para garantir paridade total entre dev e celular, vou adicionar:

- Função utilitária `wipeLocalData()` em `src/lib/db.ts` que limpa todas as tabelas de dados (trucks, producers, harvests, contracts, trips, expenses, tombstones) preservando login.
- Botão **"Limpar dados locais"** discreto na página `Configurações` (ou no menu de perfil), com modal de confirmação no estilo do sistema. Ao confirmar: limpa local + faz `pullAll` + recarrega.

Assim, tanto aqui no preview quanto no PWA do celular você consegue começar testes do zero sem dúvida.

### Arquivos a editar
- `src/lib/db.ts` — adicionar `wipeLocalData()`
- `src/pages/SettingsPage.tsx` (ou equivalente) — botão + modal de confirmação

### Operação de banco
- DELETE direto via migração nas 6 tabelas filtrando pelo `user_id`.
