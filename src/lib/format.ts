export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtNum = (v: number, dig = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: dig, maximumFractionDigits: dig });

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
