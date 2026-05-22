// Gera payload BR Code (PIX Copia e Cola) conforme EMV/BCB.
// Formato: TLV (ID + tamanho 2 dígitos + valor) + CRC16-CCITT (poly 0x1021, init 0xFFFF).

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export interface PixPayloadInput {
  chave: string;          // chave PIX (já normalizada, sem máscara para cpf/cnpj/telefone)
  tipo: PixKeyType;
  nome: string;           // beneficiário (até 25 chars)
  cidade: string;         // cidade (até 15 chars)
  valor?: number;         // opcional; se >0 inclui no QR
  txid?: string;          // identificador transação (até 25 chars alfanuméricos)
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Remove acentos e caracteres não-ASCII; recorta tamanho.
function clean(s: string, max: number): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, max);
}

export function normalizePixKey(tipo: PixKeyType, chave: string): string {
  const raw = (chave || '').trim();
  if (tipo === 'cpf' || tipo === 'cnpj') return raw.replace(/\D/g, '');
  if (tipo === 'telefone') {
    const d = raw.replace(/\D/g, '');
    // Formato exigido pelo BCB: +55DDDNUMERO
    return d.startsWith('55') ? `+${d}` : `+55${d}`;
  }
  if (tipo === 'email') return raw.toLowerCase();
  return raw; // aleatória (UUID)
}

export function buildPixPayload(input: PixPayloadInput): string {
  const chave = normalizePixKey(input.tipo, input.chave);
  const nome = clean(input.nome || 'BENEFICIARIO', 25);
  const cidade = clean(input.cidade || 'BRASIL', 15);
  const txid = (input.txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  // Merchant Account Information (ID 26)
  const mai =
    tlv('00', 'br.gov.bcb.pix') +
    tlv('01', chave);

  let payload =
    tlv('00', '01') +                        // Payload Format Indicator
    tlv('26', mai) +                         // Merchant Account Info (PIX)
    tlv('52', '0000') +                      // Merchant Category Code
    tlv('53', '986') +                       // Currency (BRL)
    (input.valor && input.valor > 0
      ? tlv('54', input.valor.toFixed(2))
      : '') +
    tlv('58', 'BR') +                        // Country
    tlv('59', nome) +                        // Merchant Name
    tlv('60', cidade) +                      // Merchant City
    tlv('62', tlv('05', txid));              // Additional Data (txid)

  payload += '6304'; // ID do CRC + tamanho
  return payload + crc16(payload);
}
