// Máscaras e validações BR

export function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}

export function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function maskCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCpfCnpj(v: string) {
  const d = onlyDigits(v);
  return d.length <= 11 ? maskCPF(v) : maskCNPJ(v);
}

export function isValidCPF(cpf: string) {
  const s = onlyDigits(cpf);
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(s[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(s[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(s[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(s[10]);
}

export function isValidCNPJ(cnpj: string) {
  const s = onlyDigits(cnpj);
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((a, w, i) => a + parseInt(base[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, ...w1];
  const d1 = calc(s.slice(0, 12), w1);
  const d2 = calc(s.slice(0, 13), w2);
  return d1 === parseInt(s[12]) && d2 === parseInt(s[13]);
}

export function isValidCpfCnpj(v: string) {
  const d = onlyDigits(v);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

// Telefone (10 ou 11 dígitos) — (99) 99999-9999
export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// Moeda BR — entrada digitada como dígitos, formatada com . e ,
// Ex: "12345" -> "123,45" ; "1234567" -> "12.345,67"
export function maskMoneyInput(v: string) {
  const d = onlyDigits(v);
  if (!d) return '';
  const n = parseInt(d, 10);
  return (n / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Converte string mascarada "1.234,56" em number 1234.56
export function parseMoney(v: string): number {
  if (!v) return 0;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
