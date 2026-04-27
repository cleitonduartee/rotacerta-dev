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
  if (y > 700) { doc.addPage(); y = 40; }
  y += 10;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Viagens', 40, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Data', 40, y); doc.text('Caminhão', 100, y); doc.text('Origem → Destino', 170, y); doc.text('Sacos', 400, y); doc.text('Valor', W - 50, y, { align: 'right' });
  y += 4; doc.line(40, y, W - 40, y); y += 12;

  for (const t of input.trips) {
    if (y > 800) { doc.addPage(); y = 40; }
    const tr = input.trucks.find(x => x.id === t.truckId);
    doc.text(fmtDate(t.data), 40, y);
    doc.text(tr?.placa ?? '—', 100, y);
    const od = `${t.origem} → ${t.destino}`;
    doc.text(od.length > 38 ? od.slice(0, 36) + '…' : od, 170, y);
    doc.text(fmtNum(t.sacos ?? 0, 1), 400, y);
    doc.text(fmtBRL(t.valorTotal), W - 50, y, { align: 'right' });
    y += 14;
  }

  doc.setFontSize(8); doc.setTextColor(140, 140, 140);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} • RotaCerta`, 40, 820);

  return doc.output('blob');
}

export function shareWhatsApp(message: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
