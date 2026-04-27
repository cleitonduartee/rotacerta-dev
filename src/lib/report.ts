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

  // Quando é relatório de um único contrato, mostra o produtor no cabeçalho
  const singleContract = input.contracts.length === 1 ? input.contracts[0] : null;
  const singleProducer = singleContract
    ? input.producers.find(pp => pp.id === singleContract.producerId)
    : null;

  // Header colorido
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, W, singleProducer ? 86 : 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ROTACERTA — Fechamento de Safra', 40, 35);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${input.harvest.nome} • ${input.harvest.tipo} • ${input.harvest.ano}`, 40, 55);
  if (singleProducer) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`Produtor: ${singleProducer.nome}  •  R$ ${fmtNum(singleContract!.valorPorSaco)} / saco`, 40, 75);
  }

  y = singleProducer ? 116 : 100;
  doc.setTextColor(20, 20, 20);

  // Caminhoneiro
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Caminhoneiro', 40, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  y += 16;
  doc.text(`Nome: ${input.driver?.nome ?? '—'}`, 40, y); y += 14;
  if (input.driver?.cpf) { doc.text(`CPF: ${input.driver.cpf}`, 40, y); y += 14; }
  if (input.driver?.telefone) { doc.text(`Tel: ${input.driver.telefone}`, 40, y); y += 14; }

  // Se for relatório multi-contrato (safra inteira), lista todos
  if (!singleProducer) {
    y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Produtores / Contratos', 40, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    y += 16;
    for (const c of input.contracts) {
      const p = input.producers.find(pp => pp.id === c.producerId);
      doc.text(`• ${p?.nome ?? '?'} — R$ ${fmtNum(c.valorPorSaco)} / saco`, 40, y); y += 14;
    }
  }

  // TOTAIS GERAIS — card moderno
  y += 14;
  const cardX = 30;
  const cardW = W - 60;
  const cardH = 150;

  // Sombra sutil + fundo branco com borda laranja
  doc.setFillColor(255, 247, 237); // laranja muito claro
  doc.roundedRect(cardX, y, cardW, cardH, 10, 10, 'F');
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(1.2);
  doc.roundedRect(cardX, y, cardW, cardH, 10, 10, 'S');

  // Título
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.setTextColor(249, 115, 22);
  doc.text('TOTAIS GERAIS', cardX + 16, y + 24);

  // Linha divisória
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.4);
  doc.line(cardX + 16, y + 32, cardX + cardW - 16, y + 32);

  // Linhas de totais (sem viagens / sem toneladas)
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  const linhas: [string, string][] = [
    ['Total de sacos (60kg)', fmtNum(input.totals.totalSacos, 2)],
    ['Receita bruta', fmtBRL(input.totals.receita)],
    ['Despesas', `- ${fmtBRL(input.totals.despesas)}`],
  ];
  let ly = y + 52;
  linhas.forEach(([k, v]) => {
    doc.setTextColor(80, 80, 80);
    doc.text(k, cardX + 20, ly);
    doc.setTextColor(20, 20, 20);
    doc.text(v, cardX + cardW - 20, ly, { align: 'right' });
    ly += 16;
  });

  // Linha divisória antes do líquido
  ly += 2;
  doc.setDrawColor(220, 220, 220);
  doc.line(cardX + 16, ly, cardX + cardW - 16, ly);
  ly += 18;

  // Valor líquido — destaque
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text('VALOR LÍQUIDO', cardX + 20, ly);
  doc.setTextColor(249, 115, 22);
  doc.setFontSize(16);
  doc.text(fmtBRL(input.totals.liquido), cardX + cardW - 20, ly, { align: 'right' });

  doc.setTextColor(20, 20, 20);
  y = y + cardH + 14;

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
  doc.text('Origem -> Destino', 165, y);
  doc.text('Nota', 340, y);
  doc.text('Sacos', 410, y, { align: 'right' });
  doc.text('Valor', W - 50, y, { align: 'right' });
  y += 4; doc.line(40, y, W - 40, y); y += 12;

  for (const t of input.trips) {
    if (y > 800) { doc.addPage(); y = 40; }
    const tr = input.trucks.find(x => x.id === t.truckId);
    doc.text(fmtDate(t.data), 40, y);
    doc.text((tr?.placa ?? '—').slice(0, 12), 95, y);
    const od = `${t.origem} -> ${t.destino}`;
    doc.text(od.length > 32 ? od.slice(0, 30) + '...' : od, 165, y);
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


  // Marca d'água diagonal em todas as páginas
  const year = new Date().getFullYear();
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    // @ts-ignore - setGState existe em runtime
    doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(42);
    doc.setTextColor(249, 115, 22);
    doc.text(
      `Desenvolvido por CLEITON DUARTE • ${year}`,
      W / 2,
      pageH / 2,
      { align: 'center', angle: 30 }
    );
    doc.restoreGraphicsState();

    // Rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} • RotaCerta • Desenvolvido por CLEITON DUARTE © ${year}`,
      W / 2,
      pageH - 20,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

export function shareWhatsApp(message: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
