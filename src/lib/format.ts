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

export const fmtHarvestTipo = (tipo?: string) => {
  const map: Record<string, string> = {
    milho_sorgo: 'Milho/Sorgo',
    milho: 'Milho',
    sorgo: 'Sorgo',
    soja: 'Soja',
    algodao: 'Algodão',
  };
  if (!tipo) return '—';
  return map[tipo] ?? (tipo.charAt(0).toUpperCase() + tipo.slice(1));
};

/** Nome padrão da safra: "Milho/Sorgo - 2026" */
export const fmtHarvestName = (harvest?: { nome?: string; tipo?: string; ano?: number }) => {
  if (!harvest) return '—';
  const tipo = fmtHarvestTipo(harvest.tipo);
  return harvest.ano ? `${tipo} - ${harvest.ano}` : tipo;
};

export const fmtCultura = (c?: string) =>
  c === 'sorgo' ? 'Sorgo' : c === 'milho' ? 'Milho' : '';

/** Cria um slug seguro para nomes de arquivo: remove acentos, troca espaços por hífen e preserva '/' */
export const slugFileName = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-\/]/g, '')
    .replace(/-+/g, '-');
