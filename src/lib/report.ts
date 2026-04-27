import jsPDF from 'jspdf';
import { fmtBRL, fmtDate, fmtNum } from './format';

export interface ReportInput {
  driver?: any;
  harvest: any;
  contracts: any[];
  producers: any[];
  trips: any[];
  expenses: any[];
  trucks: any[];
  totals: { totalSacos: number; totalToneladas: number; receita: number; despesas: number; liquido: number };
}

export async function generateHarvestReport(input: ReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header colorido
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, W, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ROTACERTA — Fechamento de Safra', 40, 35);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${input.harvest.nome} • ${input.harvest.tipo} • ${input.harvest.ano}`, 40, 55);

  y = 100;
  doc.setTextColor(20, 20, 20);

  // Caminhoneiro
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Caminhoneiro', 40, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  y += 16;
  doc.text(`Nome: ${input.driver?.nome ?? '—'}`, 40, y); y += 14;
  if (input.driver?.cpf) { doc.text(`CPF: ${input.driver.cpf}`, 40, y); y += 14; }
  if (input.driver?.telefone) { doc.text(`Tel: ${input.driver.telefone}`, 40, y); y += 14; }

  // Produtores
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Produtores / Contratos', 40, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  y += 16;
  for (const c of input.contracts) {
    const p = input.producers.find(pp => pp.id === c.producerId);
    doc.text(`• ${p?.nome ?? '?'} — R$ ${fmtNum(c.valorPorSaco)} / saco`, 40, y); y += 14;
  }

  // TOTAIS
  y += 10;
  doc.setFillColor(245, 245, 245);
  doc.rect(30, y, W - 60, 110, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.setTextColor(249, 115, 22);
  doc.text('TOTAIS GERAIS', 40, y + 22);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  const lines: [string, string][] = [
    ['Total de sacos (60kg)', fmtNum(input.totals.totalSacos, 2)],
    ['Total em toneladas', fmtNum(input.totals.totalToneladas, 2)],
    ['Total de viagens', String(input.trips.length)],
    ['Receita bruta', fmtBRL(input.totals.receita)],
    ['Despesas', fmtBRL(input.totals.despesas)],
    ['Valor LÍQUIDO', fmtBRL(input.totals.liquido)],
  ];
  let ly = y + 40;
  lines.forEach(([k, v], i) => {
    if (i === lines.length - 1) doc.setFont('helvetica', 'bold');
    doc.text(k, 50, ly);
    doc.text(v, W - 50, ly, { align: 'right' });
    ly += 14;
  });
  y = ly + 10;

  // Por caminhão
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Resumo por caminhão', 40, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  for (const tr of input.trucks) {
    const ts = input.trips.filter(t => t.truckId === tr.id);
    if (ts.length === 0) continue;
    const sacos = ts.reduce((s, t) => s + (t.sacos || 0), 0);
    const valor = ts.reduce((s, t) => s + t.valorTotal, 0);
    doc.text(`${tr.placa} — ${ts.length} viagens • ${fmtNum(sacos, 1)} sacos • ${fmtBRL(valor)}`, 40, y);
    y += 14;
  }

  // Lista de viagens
  if (y > 680) { doc.addPage(); y = 40; }
  y += 10;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Viagens', 40, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Data', 40, y);
  doc.text('Caminhão', 95, y);
  doc.text('Origem → Destino', 165, y);
  doc.text('Nota', 340, y);
  doc.text('Sacos', 410, y, { align: 'right' });
  doc.text('Valor', W - 50, y, { align: 'right' });
  y += 4; doc.line(40, y, W - 40, y); y += 12;

  for (const t of input.trips) {
    if (y > 800) { doc.addPage(); y = 40; }
    const tr = input.trucks.find(x => x.id === t.truckId);
    doc.text(fmtDate(t.data), 40, y);
    doc.text((tr?.placa ?? '—').slice(0, 12), 95, y);
    const od = `${t.origem} → ${t.destino}`;
    doc.text(od.length > 32 ? od.slice(0, 30) + '…' : od, 165, y);
    doc.text((t.notaProdutor ?? '—').toString().slice(0, 12), 340, y);
    doc.text(fmtNum(t.sacos ?? 0, 1), 410, y, { align: 'right' });
    doc.text(fmtBRL(t.valorTotal), W - 50, y, { align: 'right' });
    y += 14;
  }

  // Despesas por tipo
  if (input.expenses && input.expenses.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    y += 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Despesas por tipo', 40, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

    const porTipo = new Map<string, number>();
    for (const e of input.expenses) {
      porTipo.set(e.tipo || 'Outros', (porTipo.get(e.tipo || 'Outros') ?? 0) + (e.valor || 0));
    }
    const tipos = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
    for (const [tipo, valor] of tipos) {
      if (y > 800) { doc.addPage(); y = 40; }
      doc.text(`• ${tipo}`, 50, y);
      doc.text(fmtBRL(valor), W - 50, y, { align: 'right' });
      y += 14;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Total despesas', 50, y);
    doc.text(fmtBRL(input.totals.despesas), W - 50, y, { align: 'right' });
    y += 16;
    doc.setFont('helvetica', 'normal');

    // Detalhamento das despesas
    if (y > 720) { doc.addPage(); y = 40; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Despesas detalhadas', 40, y); y += 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Data', 40, y); doc.text('Tipo', 100, y); doc.text('Descrição', 200, y); doc.text('Valor', W - 50, y, { align: 'right' });
    y += 4; doc.line(40, y, W - 40, y); y += 12;
    const exps = [...input.expenses].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    for (const e of exps) {
      if (y > 800) { doc.addPage(); y = 40; }
      doc.text(fmtDate(e.data), 40, y);
      doc.text((e.tipo || '—').slice(0, 18), 100, y);
      doc.text((e.descricao || '—').slice(0, 50), 200, y);
      doc.text(fmtBRL(e.valor), W - 50, y, { align: 'right' });
      y += 13;
    }
  }


  doc.setFontSize(8); doc.setTextColor(140, 140, 140);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} • RotaCerta`, 40, 820);

  return doc.output('blob');
}

export function shareWhatsApp(message: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
