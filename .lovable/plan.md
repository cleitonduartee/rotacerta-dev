
# QR Code PIX no relatório de fechamento

## Objetivo
Quando o caminhoneiro encaminhar o relatório por WhatsApp, o produtor abre o PDF e já vê: **chave PIX**, **dados bancários** e um **QR Code PIX Copia e Cola** com o **valor líquido** já preenchido. Basta escanear no app do banco e pagar.

## O que o usuário precisa cadastrar (uma vez)
Em **Cadastros → Seus dados (caminhoneiro)**, novos campos opcionais:

- **Tipo de chave PIX**: CPF/CNPJ, Telefone, E-mail ou Chave aleatória
- **Chave PIX** (com máscara conforme o tipo)
- **Nome do beneficiário** (pré-preenchido com o nome do cadastro)
- **Cidade do beneficiário** (obrigatório no padrão BR Code, até 15 caracteres)
- **Banco** (texto livre, ex.: "Sicredi")
- **Agência** e **Conta** (texto livre, opcional — aparecem só como referência no PDF)

Validação por tipo de chave (CPF/CNPJ via dígito verificador, e-mail por regex, telefone +55DDDNUMERO, aleatória UUID).

## O que aparece no PDF de fechamento

Novo bloco **"Pagamento via PIX"** abaixo do card de TOTAIS GERAIS, só quando o caminhoneiro tiver chave PIX cadastrada:

```text
┌─────────────────────────────────────────────┐
│ PAGAMENTO VIA PIX                           │
│                                             │
│  [ QR CODE ]   Beneficiário: João da Silva  │
│   ~140x140     Chave (CPF): 123.456.789-00  │
│                Banco: Sicredi               │
│                Ag: 0001  Conta: 12345-6     │
│                                             │
│  Valor: R$ 12.345,67  (já no QR Code)       │
│                                             │
│  PIX Copia e Cola:                          │
│  00020126360014BR.GOV.BCB.PIX0114+5511...   │
└─────────────────────────────────────────────┘
```

- O QR Code carrega o **payload BR Code (EMV)** já com o valor líquido do fechamento — o produtor escaneia e o app do banco abre com valor pronto.
- Abaixo do QR vai o **Copia e Cola** em texto, para quem prefere colar manualmente.
- Se for relatório da **safra inteira** (vários contratos), o QR usa o **valor líquido total**. Se for de **um contrato só**, usa o líquido daquele contrato (comportamento já existente no relatório).

## Quando o bloco PIX NÃO aparece
- Caminhoneiro sem chave PIX cadastrada → relatório sai como hoje, sem o bloco.
- Valor líquido ≤ 0 → mostra apenas a chave e os dados bancários, sem QR (PIX não aceita valor zero/negativo).

---

## Detalhes técnicos (para referência)

### 1. Schema local (Dexie / IndexedDB)
Bump da versão do `db.ts` adicionando ao tipo `Driver`:
```ts
pixTipo?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
pixChave?: string;
pixBeneficiario?: string;
pixCidade?: string;
banco?: string;
agencia?: string;
conta?: string;
```
Migração Dexie sem perda de dados (campos opcionais).

### 2. Sincronização Cloud
Adicionar as mesmas colunas na tabela `profiles` (Supabase) para que o cadastro acompanhe o usuário entre dispositivos. Migração SQL incluindo:
```
ALTER TABLE public.profiles
  ADD COLUMN pix_tipo text,
  ADD COLUMN pix_chave text,
  ADD COLUMN pix_beneficiario text,
  ADD COLUMN pix_cidade text,
  ADD COLUMN banco text,
  ADD COLUMN agencia text,
  ADD COLUMN conta text;
```
RLS já existente (`profiles_*_own`) cobre os novos campos. Atualizar `src/lib/sync.ts` para enviar/receber os novos campos junto com o profile.

### 3. UI de cadastro (`src/pages/CadastrosPage.tsx`)
Nova seção **"Recebimento (PIX)"** dentro do `DriverSection`, com:
- `Select` para tipo de chave
- `Input` com máscara dinâmica
- Campos banco/agência/conta/cidade
- Mesma lógica de "salvar/cancelar/editar" já usada hoje

### 4. Geração do payload BR Code
Adicionar dependência `pix-utils` (ou implementação própria em ~80 linhas — preferível para não inflar bundle; o algoritmo é determinístico: TLV + CRC16-CCITT). Função pura em `src/lib/pix.ts`:
```ts
buildPixPayload({ chave, nome, cidade, valor, txid }): string
```

### 5. Geração do QR Code
Adicionar dependência `qrcode` (já popular, ~20kb gz). No `src/lib/report.ts`:
```ts
const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 280 });
doc.addImage(dataUrl, 'PNG', x, y, 110, 110);
```

### 6. Atualização do relatório (`src/lib/report.ts`)
- Receber `driver` com os novos campos (já é passado).
- Tornar `generateHarvestReport` `async` (hoje já é) e gerar o QR antes de desenhar.
- Renderizar o bloco PIX após o card de TOTAIS, antes de "Resumo por caminhão".
- Garantir paginação: se faltar espaço, `doc.addPage()`.

### 7. Compartilhamento WhatsApp
A função `shareWhatsApp` continua igual — o PDF gerado já carrega o QR embutido. Sem mudança em `HarvestDetail.tsx` além de garantir que os novos campos do driver sejam passados (já são, via `driver[0]`).

---

## Não está no escopo
- Cobrança PIX dinâmica com URL/API de banco (exigiria integração bancária).
- Atualização automática de status "pago/não pago".
- Múltiplas chaves PIX por caminhoneiro.

Esses ficam como evoluções futuras.
