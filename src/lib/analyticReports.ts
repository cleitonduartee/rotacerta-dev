import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtBRL, fmtDate, fmtNum } from './format';

// ============================================================================
// TIPOS
// ============================================================================
type Trip = any;
type Expense = any;
type Contract = any;
type Producer = any;
type Harvest = any;
type Truck = any;
type Driver = any;

interface BaseInput {
  driver?: Driver;
  trips: Trip[];
  expenses: Expense[];
  trucks: Truck[];
  contracts: Contract[];
  producers: Producer[];
  harvests: Harvest[];
}

export interface HarvestReportInput extends BaseInput {
  harvest: Harvest;
  contractsAbertos: Contract[];
}

export interface ContractReportInput extends BaseInput {
  contract: Contract;
}

export interface MonthReportInput extends BaseInput {
  mes: string; // YYYY-MM
}

export interface FreteReportInput extends BaseInput {
  trip: Trip;
}

// ============================================================================
// PALETA / CONSTANTES VISUAIS
// ============================================================================
const COLORS = {
  primary: [249, 115, 22] as [number, number, number],     // laranja
  primarySoft: [255, 247, 237] as [number, number, number],
  ink: [20, 20, 20] as [number, number, number],
  muted: [110, 110, 110] as [number, number, number],
  light: [240, 240, 240] as [number, number, number],
  border: [220, 220, 220] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  warningSoft: [254, 243, 199] as [number, number, number],
};

// ============================================================================
// HELPERS DE DESENHO
// ============================================================================
function drawHeader(doc: jsPDF, titulo: string, subtitulo: string, driver?: Driver) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, W, 78, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ROTASAFRA', 40, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Relatório analítico', 40, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(titulo, 40, 62);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subtitulo, 40, 74);

  // Caixa do caminhoneiro à direita
  if (driver?.nome) {
    doc.setFontSize(8);
    doc.text('Caminhoneiro', W - 40, 28, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(driver.nome, W - 40, 42, { align: 'right' });
    if (driver.cpf) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`CPF: ${driver.cpf}`, W - 40, 54, { align: 'right' });
    }
    if (driver.telefone) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(driver.telefone, W - 40, 66, { align: 'right' });
    }
  }
  doc.setTextColor(...COLORS.ink);
}

function drawKPIs(
  doc: jsPDF,
  y: number,
  kpis: { label: string; value: string; tone?: 'default' | 'success' | 'danger' | 'highlight' }[]
): number {
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  const gap = 10;
  const totalW = W - margin * 2;
  const cardW = (totalW - gap * (kpis.length - 1)) / kpis.length;
  const cardH = 58;

  kpis.forEach((k, i) => {
    const x = margin + i * (cardW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, cardW, cardH, 6, 6, 'FD');

    // barra de cor lateral
    let barColor = COLORS.muted;
    if (k.tone === 'success') barColor = COLORS.success;
    if (k.tone === 'danger') barColor = COLORS.danger;
    if (k.tone === 'highlight') barColor = COLORS.primary;
    doc.setFillColor(...barColor);
    doc.roundedRect(x, y, 4, cardH, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(k.label.toUpperCase(), x + 12, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...(k.tone === 'highlight' ? COLORS.primary : k.tone === 'danger' ? COLORS.danger : k.tone === 'success' ? COLORS.success : COLORS.ink));
    doc.text(k.value, x + 12, y + 38);
  });

  doc.setTextColor(...COLORS.ink);
  return y + cardH + 14;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string, hint?: string): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.primary);
  doc.rect(40, y, 3, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.ink);
  doc.text(title, 50, y + 11);
  if (hint) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(hint, W - 40, y + 11, { align: 'right' });
  }
  doc.setTextColor(...COLORS.ink);
  return y + 22;
}

function drawResultBox(
  doc: jsPDF,
  y: number,
  receita: number,
  despesas: number,
  liquido: number
): number {
  const W = doc.internal.pageSize.getWidth();
  const x = 40;
  const w = W - 80;
  const h = 90;

  doc.setFillColor(...COLORS.primarySoft);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.roundedRect(x, y, w, h, 8, 8, 'FD');

  // Linhas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text('Receita bruta', x + 18, y + 22);
  doc.text('(-) Despesas', x + 18, y + 40);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.success);
  doc.text(fmtBRL(receita), x + w - 18, y + 22, { align: 'right' });
  doc.setTextColor(...COLORS.danger);
  doc.text(`- ${fmtBRL(despesas)}`, x + w - 18, y + 40, { align: 'right' });

  // divisor
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(x + 18, y + 52, x + w - 18, y + 52);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  doc.text('VALOR LÍQUIDO', x + 18, y + 74);
  doc.setFontSize(18);
  doc.setTextColor(...(liquido >= 0 ? COLORS.primary : COLORS.danger));
  doc.text(fmtBRL(liquido), x + w - 18, y + 76, { align: 'right' });

  doc.setTextColor(...COLORS.ink);
  return y + h + 14;
}

function drawWarning(doc: jsPDF, y: number, lines: string[]): number {
  const W = doc.internal.pageSize.getWidth();
  const x = 40;
  const w = W - 80;
  const h = 24 + lines.length * 12;
  doc.setFillColor(...COLORS.warningSoft);
  doc.setDrawColor(...COLORS.warning);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.warning);
  doc.text('! Atencao', x + 12, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  lines.forEach((l, i) => doc.text(l, x + 12, y + 30 + i * 12));
  return y + h + 12;
}

function drawFooter(doc: jsPDF) {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const year = new Date().getFullYear();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // marca d'água
    doc.saveGraphicsState();
    // @ts-ignore
    doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(50);
    doc.setTextColor(...COLORS.primary);
    doc.text('ROTASAFRA', W / 2, H / 2, { align: 'center', angle: 30 });
    doc.restoreGraphicsState();

    // rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} • RotaSafra © ${year}`,
      40, H - 18
    );
    doc.text(`Página ${i} / ${totalPages}`, W - 40, H - 18, { align: 'right' });
  }
}

// ============================================================================
// AGREGAÇÕES POR TIPO
// ============================================================================
function aggExpensesByType(expenses: Expense[]) {
  const m = new Map<string, number>();
  expenses.forEach(e => m.set(e.tipo || 'Outros', (m.get(e.tipo || 'Outros') ?? 0) + (e.valor || 0)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function aggByTruck(trips: Trip[], trucks: Truck[]) {
  return trucks
    .map(tr => {
      const ts = trips.filter(t => t.truckId === tr.id);
      return {
        placa: tr.placa,
        viagens: ts.length,
        sacos: ts.reduce((s, t) => s + (t.sacos || 0), 0),
        toneladas: ts.reduce((s, t) => s + (t.pesoToneladas || 0), 0),
        valor: ts.reduce((s, t) => s + (t.valorTotal || 0), 0),
      };
    })
    .filter(r => r.viagens > 0)
    .sort((a, b) => b.valor - a.valor);
}

// ============================================================================
// RELATÓRIO: SAFRA (analítico)
// ============================================================================
export async function generateAnalyticHarvestReport(input: HarvestReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(
    doc,
    `Safra ${input.harvest.nome}`,
    `${input.harvest.tipo} • ${input.harvest.ano}`,
    input.driver
  );

  let y = 100;

  // Aviso de contratos abertos
  if (input.contractsAbertos.length > 0) {
    const lines = [
      `Existem ${input.contractsAbertos.length} contrato(s) ainda em aberto. O resultado abaixo é parcial.`,
      ...input.contractsAbertos.map(c => {
        const p = input.producers.find(pp => pp.id === c.producerId);
        return `• ${p?.nome ?? '?'}`;
      }),
    ];
    y = drawWarning(doc, y, lines);
  }

  // KPIs gerais
  const totalSacos = input.trips.reduce((s, t) => s + (t.sacos || 0), 0);
  const totalTon = totalSacos * 60 / 1000;
  const receita = input.trips.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const despesas = input.expenses.reduce((s, e) => s + (e.valor || 0), 0);
  const liquido = receita - despesas;

  y = drawKPIs(doc, y, [
    { label: 'Viagens', value: String(input.trips.length) },
    { label: 'Sacos', value: fmtNum(totalSacos, 1) },
    { label: 'Toneladas', value: fmtNum(totalTon, 2) },
    { label: 'Contratos', value: String(input.contracts.length) },
  ]);

  y = drawResultBox(doc, y, receita, despesas, liquido);

  // ========== POR CONTRATO ==========
  y = drawSectionTitle(doc, y, 'Resultado por contrato', `${input.contracts.length} contrato(s)`);

  const contractRows = input.contracts.map(c => {
    const p = input.producers.find(pp => pp.id === c.producerId);
    const ts = input.trips.filter(t => t.contractId === c.id);
    const exs = input.expenses.filter(e =>
      e.contractId === c.id || (e.tripId && ts.some(t => t.id === e.tripId))
    );
    const sacos = ts.reduce((s, t) => s + (t.sacos || 0), 0);
    const rec = ts.reduce((s, t) => s + (t.valorTotal || 0), 0);
    const desp = exs.reduce((s, e) => s + (e.valor || 0), 0);
    return [
      p?.nome ?? '?',
      c.fechado ? 'Fechado' : 'Aberto',
      `R$ ${fmtNum(c.valorPorSaco, 2)}`,
      String(ts.length),
      fmtNum(sacos, 1),
      fmtBRL(rec),
      `- ${fmtBRL(desp)}`,
      fmtBRL(rec - desp),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Produtor', 'Status', 'R$/saco', 'Viagens', 'Sacos', 'Receita', 'Despesas', 'Líquido']],
    body: contractRows,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      3: { halign: 'right' }, 4: { halign: 'right' },
      5: { halign: 'right' }, 6: { halign: 'right', textColor: COLORS.danger },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 18;

  // ========== POR CAMINHÃO ==========
  const trucksAgg = aggByTruck(input.trips, input.trucks);
  if (trucksAgg.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Resumo por caminhão');
    autoTable(doc, {
      startY: y,
      head: [['Placa', 'Viagens', 'Sacos', 'Receita']],
      body: trucksAgg.map(t => [t.placa, t.viagens, fmtNum(t.sacos, 1), fmtBRL(t.valor)]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.ink, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // ========== DESPESAS POR TIPO ==========
  const expByType = aggExpensesByType(input.expenses);
  if (expByType.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Despesas por categoria');
    autoTable(doc, {
      startY: y,
      head: [['Categoria', '% do total', 'Valor']],
      body: expByType.map(([t, v]) => [
        t,
        `${((v / despesas) * 100).toFixed(1)}%`,
        fmtBRL(v),
      ]),
      foot: [['Total', '100%', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 9 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // ========== DETALHE: VIAGENS ==========
  if (input.trips.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Viagens detalhadas', `${input.trips.length} viagem(ns)`);
    const tripsSorted = [...input.trips].sort((a, b) => a.data.localeCompare(b.data));
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Caminhão', 'Origem -> Destino', 'Produtor', 'Nota', 'Sacos', 'Valor']],
      body: tripsSorted.map(t => {
        const c = input.contracts.find(cc => cc.id === t.contractId);
        const p = c ? input.producers.find(pp => pp.id === c.producerId) : null;
        const tr = input.trucks.find(x => x.id === t.truckId);
        return [
          fmtDate(t.data),
          tr?.placa ?? '—',
          `${t.origem} -> ${t.destino}`,
          p?.nome ?? '—',
          t.numeroNota || '-',
          t.sacos ? fmtNum(t.sacos, 1) : '—',
          fmtBRL(t.valorTotal),
        ];
      }),
      foot: [['', '', '', '', '', 'Total', fmtBRL(receita)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: COLORS.primarySoft, textColor: COLORS.primary, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // ========== DETALHE: DESPESAS ==========
  if (input.expenses.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Despesas detalhadas', `${input.expenses.length} lançamento(s)`);
    const expSorted = [...input.expenses].sort((a, b) => a.data.localeCompare(b.data));
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Categoria', 'Descrição', 'Valor']],
      body: expSorted.map(e => [fmtDate(e.data), e.tipo, e.descricao || '—', fmtBRL(e.valor)]),
      foot: [['', '', 'Total', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 90 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 70, halign: 'right', textColor: COLORS.danger, fontStyle: 'bold' } },
      styles: { overflow: 'linebreak', cellWidth: 'wrap' },
      tableWidth: 'auto',
      margin: { left: 40, right: 40 },
    });
  }

  drawFooter(doc);
  return doc.output('blob');
}

// ============================================================================
// RELATÓRIO: CONTRATO (moderno)
// ============================================================================
function drawContractHero(
  doc: jsPDF,
  y: number,
  receita: number,
  despesas: number,
  liquido: number,
  margem: number,
  fechado: boolean
): number {
  const W = doc.internal.pageSize.getWidth();
  const x = 40;
  const w = W - 80;
  const h = 150;

  // Painel principal escuro
  doc.setFillColor(...COLORS.ink);
  doc.roundedRect(x, y, w, h, 10, 10, 'F');

  // Faixa lateral colorida (status do líquido)
  const accent = liquido >= 0 ? COLORS.primary : COLORS.danger;
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 6, h, 3, 3, 'F');

  // Status pill
  const pillW = 86;
  doc.setFillColor(...(fechado ? COLORS.success : COLORS.warning));
  doc.roundedRect(x + w - pillW - 16, y + 16, pillW, 18, 9, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(fechado ? 'CONTRATO FECHADO' : 'EM ABERTO', x + w - pillW / 2 - 16, y + 28, { align: 'center' });

  // Label líquido
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text('RESULTADO LÍQUIDO', x + 22, y + 32);

  // Valor líquido grande
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...accent);
  doc.text(fmtBRL(liquido), x + 22, y + 70);

  // Margem
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Margem ${margem.toFixed(1)}% sobre a receita`, x + 22, y + 86);

  // Linha divisória
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(x + 22, y + 100, x + w - 22, y + 100);

  // Receita / Despesas lado a lado
  const colW = (w - 44) / 2;
  // Receita
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('RECEITA BRUTA', x + 22, y + 118);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.success);
  doc.text(fmtBRL(receita), x + 22, y + 138);

  // Despesas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('DESPESAS TOTAIS', x + 22 + colW, y + 118);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.danger);
  doc.text(`- ${fmtBRL(despesas)}`, x + 22 + colW, y + 138);

  doc.setTextColor(...COLORS.ink);
  return y + h + 16;
}

function drawContractInfoCard(
  doc: jsPDF,
  y: number,
  produtor: string,
  safra: string,
  rPorSaco: number,
  totalSacos: number,
  totalTon: number,
  viagens: number
): number {
  const W = doc.internal.pageSize.getWidth();
  const x = 40;
  const w = W - 80;
  const h = 78;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 8, 8, 'FD');

  const items = [
    { label: 'PRODUTOR', value: produtor },
    { label: 'SAFRA', value: safra },
    { label: 'R$/SACO', value: fmtBRL(rPorSaco) },
    { label: 'VIAGENS', value: String(viagens) },
    { label: 'SACOS', value: fmtNum(totalSacos, 1) },
    { label: 'TONELADAS', value: fmtNum(totalTon, 2) },
  ];
  const colW = w / items.length;
  items.forEach((it, i) => {
    const cx = x + colW * i + colW / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(it.label, cx, y + 22, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.ink);
    const txt = it.value.length > 18 ? it.value.slice(0, 17) + '…' : it.value;
    doc.text(txt, cx, y + 46, { align: 'center' });
    if (i < items.length - 1) {
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(x + colW * (i + 1), y + 14, x + colW * (i + 1), y + h - 14);
    }
  });
  return y + h + 16;
}

export async function generateAnalyticContractReport(input: ContractReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const c = input.contract;
  const p = input.producers.find(pp => pp.id === c.producerId);
  const h = input.harvests.find(hh => hh.id === c.harvestId);

  drawHeader(
    doc,
    `Fechamento de Contrato`,
    `${p?.nome ?? '?'} • ${h?.nome ?? '?'} ${h?.ano ?? ''}`,
    input.driver
  );

  let y = 100;

  if (!c.fechado) {
    y = drawWarning(doc, y, ['Este contrato ainda está em aberto. Os valores podem mudar até o fechamento.']);
  }

  const totalSacos = input.trips.reduce((s, t) => s + (t.sacos || 0), 0);
  const totalTon = totalSacos * 60 / 1000;
  const receita = input.trips.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const despesas = input.expenses.reduce((s, e) => s + (e.valor || 0), 0);
  const liquido = receita - despesas;
  const margem = receita > 0 ? (liquido / receita) * 100 : 0;
  const custoPorSaco = totalSacos > 0 ? despesas / totalSacos : 0;
  const liquidoPorSaco = totalSacos > 0 ? liquido / totalSacos : 0;
  const ticketMedio = input.trips.length > 0 ? receita / input.trips.length : 0;

  // HERO
  y = drawContractHero(doc, y, receita, despesas, liquido, margem, !!c.fechado);

  // INFO CARD
  y = drawContractInfoCard(
    doc, y,
    p?.nome ?? '—',
    `${h?.nome ?? '—'}`,
    c.valorPorSaco,
    totalSacos,
    totalTon,
    input.trips.length,
  );

  // KPIs secundários (indicadores)
  y = drawKPIs(doc, y, [
    { label: 'Ticket médio/viagem', value: fmtBRL(ticketMedio) },
    { label: 'Custo por saco', value: fmtBRL(custoPorSaco), tone: 'danger' },
    { label: 'Líquido por saco', value: fmtBRL(liquidoPorSaco), tone: liquidoPorSaco >= 0 ? 'highlight' : 'danger' },
    { label: 'Margem líquida', value: `${margem.toFixed(1)}%`, tone: margem >= 0 ? 'success' : 'danger' },
  ]);

  // Por caminhão
  const trucksAgg = aggByTruck(input.trips, input.trucks);
  if (trucksAgg.length > 0) {
    y = drawSectionTitle(doc, y, 'Resumo por caminhão');
    autoTable(doc, {
      startY: y,
      head: [['Placa', 'Viagens', 'Sacos', 'Receita']],
      body: trucksAgg.map(t => [t.placa, t.viagens, fmtNum(t.sacos, 1), fmtBRL(t.valor)]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.ink, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Despesas por tipo
  const expByType = aggExpensesByType(input.expenses);
  if (expByType.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Despesas por categoria');
    autoTable(doc, {
      startY: y,
      head: [['Categoria', '% do total', 'Valor']],
      body: expByType.map(([t, v]) => [t, `${((v / despesas) * 100).toFixed(1)}%`, fmtBRL(v)]),
      foot: [['Total', '100%', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 9 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Viagens
  if (input.trips.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Viagens detalhadas');
    const tripsSorted = [...input.trips].sort((a, b) => a.data.localeCompare(b.data));
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Caminhão', 'Origem -> Destino', 'Nota', 'Sacos', 'Valor']],
      body: tripsSorted.map(t => {
        const tr = input.trucks.find(x => x.id === t.truckId);
        return [
          fmtDate(t.data), tr?.placa ?? '—',
          `${t.origem} -> ${t.destino}`,
          t.numeroNota || '-',
          t.sacos ? fmtNum(t.sacos, 1) : '—',
          fmtBRL(t.valorTotal),
        ];
      }),
      foot: [['', '', '', '', 'Total', fmtBRL(receita)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: COLORS.primarySoft, textColor: COLORS.primary, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Despesas detalhadas
  if (input.expenses.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Despesas detalhadas');
    const expSorted = [...input.expenses].sort((a, b) => a.data.localeCompare(b.data));
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Categoria', 'Descrição', 'Valor']],
      body: expSorted.map(e => [fmtDate(e.data), e.tipo, e.descricao || '—', fmtBRL(e.valor)]),
      foot: [['', '', 'Total', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 90 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 70, halign: 'right', textColor: COLORS.danger, fontStyle: 'bold' } },
      styles: { overflow: 'linebreak', cellWidth: 'wrap' },
      tableWidth: 'auto',
      margin: { left: 40, right: 40 },
    });
  }

  drawFooter(doc);
  return doc.output('blob');
}

// ============================================================================
// RELATÓRIO: MENSAL
// ============================================================================
export async function generateAnalyticMonthReport(input: MonthReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const [yyyy, mm] = input.mes.split('-');
  const monthName = new Date(Number(yyyy), Number(mm) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  drawHeader(doc, `Fechamento Mensal`, monthName.charAt(0).toUpperCase() + monthName.slice(1), input.driver);

  let y = 100;

  const safraTrips = input.trips.filter(t => t.kind === 'safra');
  const freteTrips = input.trips.filter(t => t.kind === 'frete');
  const totalSacos = safraTrips.reduce((s, t) => s + (t.sacos || 0), 0);
  const receita = input.trips.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const recSafra = safraTrips.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const recFrete = freteTrips.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const despesas = input.expenses.reduce((s, e) => s + (e.valor || 0), 0);
  const liquido = receita - despesas;

  y = drawKPIs(doc, y, [
    { label: 'Viagens', value: String(input.trips.length) },
    { label: 'Receita Safra', value: fmtBRL(recSafra) },
    { label: 'Receita Frete', value: fmtBRL(recFrete) },
    { label: 'Sacos', value: fmtNum(totalSacos, 1) },
  ]);

  y = drawResultBox(doc, y, receita, despesas, liquido);

  // Receita por tipo
  y = drawSectionTitle(doc, y, 'Receita por tipo');
  autoTable(doc, {
    startY: y,
    head: [['Tipo', 'Viagens', 'Receita', '%']],
    body: [
      ['Safra (lavoura)', safraTrips.length, fmtBRL(recSafra), receita ? `${((recSafra / receita) * 100).toFixed(1)}%` : '0%'],
      ['Frete avulso', freteTrips.length, fmtBRL(recFrete), receita ? `${((recFrete / receita) * 100).toFixed(1)}%` : '0%'],
    ],
    foot: [['Total', input.trips.length, fmtBRL(receita), '100%']],
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 9 },
    footStyles: { fillColor: COLORS.primarySoft, textColor: COLORS.primary, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 18;

  // Por caminhão
  const trucksAgg = aggByTruck(input.trips, input.trucks);
  if (trucksAgg.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Resumo por caminhão');
    autoTable(doc, {
      startY: y,
      head: [['Placa', 'Viagens', 'Sacos', 'Receita']],
      body: trucksAgg.map(t => [t.placa, t.viagens, fmtNum(t.sacos, 1), fmtBRL(t.valor)]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.ink, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Despesas por tipo
  const expByType = aggExpensesByType(input.expenses);
  if (expByType.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Despesas por categoria');
    autoTable(doc, {
      startY: y,
      head: [['Categoria', '% do total', 'Valor']],
      body: expByType.map(([t, v]) => [t, `${((v / despesas) * 100).toFixed(1)}%`, fmtBRL(v)]),
      foot: [['Total', '100%', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 9 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Viagens detalhadas
  if (input.trips.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Viagens detalhadas');
    const tripsSorted = [...input.trips].sort((a, b) => a.data.localeCompare(b.data));
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Tipo', 'Caminhão', 'Origem -> Destino', 'Sacos', 'Valor']],
      body: tripsSorted.map(t => {
        const tr = input.trucks.find(x => x.id === t.truckId);
        return [
          fmtDate(t.data),
          t.kind === 'safra' ? 'Safra' : 'Frete',
          tr?.placa ?? '—',
          `${t.origem} -> ${t.destino}`,
          t.sacos ? fmtNum(t.sacos, 1) : '—',
          fmtBRL(t.valorTotal),
        ];
      }),
      foot: [['', '', '', '', 'Total', fmtBRL(receita)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: COLORS.primarySoft, textColor: COLORS.primary, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Despesas detalhadas
  if (input.expenses.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Despesas detalhadas');
    const expSorted = [...input.expenses].sort((a, b) => a.data.localeCompare(b.data));
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Categoria', 'Descrição', 'Valor']],
      body: expSorted.map(e => [fmtDate(e.data), e.tipo, e.descricao || '—', fmtBRL(e.valor)]),
      foot: [['', '', 'Total', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 90 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 70, halign: 'right', textColor: COLORS.danger, fontStyle: 'bold' } },
      styles: { overflow: 'linebreak', cellWidth: 'wrap' },
      tableWidth: 'auto',
      margin: { left: 40, right: 40 },
    });
  }

  drawFooter(doc);
  return doc.output('blob');
}

// ============================================================================
// RELATÓRIO: FRETE AVULSO
// ============================================================================
export async function generateAnalyticFreteReport(input: FreteReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const t = input.trip;
  const tr = input.trucks.find(x => x.id === t.truckId);

  drawHeader(
    doc,
    'Frete Avulso',
    `${fmtDate(t.data)} • ${t.origem} -> ${t.destino}`,
    input.driver
  );

  let y = 100;

  const receita = t.valorTotal || 0;
  const despesas = input.expenses.reduce((s, e) => s + (e.valor || 0), 0);
  const liquido = receita - despesas;
  const ton = t.pesoToneladas || 0;
  const rPorTon = ton > 0 ? receita / ton : 0;

  y = drawKPIs(doc, y, [
    { label: 'Caminhão', value: tr?.placa ?? '—' },
    { label: 'Toneladas', value: ton ? fmtNum(ton, 2) : '—' },
    { label: 'R$/Ton', value: ton ? fmtBRL(rPorTon) : '—' },
    { label: 'Despesas', value: fmtBRL(despesas), tone: 'danger' },
  ]);

  // Detalhes do frete
  y = drawSectionTitle(doc, y, 'Dados do frete');
  autoTable(doc, {
    startY: y,
    body: [
      ['Data', fmtDate(t.data)],
      ['Origem', t.origem],
      ['Destino', t.destino],
      ['Caminhão', tr?.placa ?? '—'],
      ['Transportadora', t.transportadora || '—'],
      ['Peso (ton)', ton ? fmtNum(ton, 2) : '—'],
      ['Modalidade', t.valorPorTonelada ? `Por tonelada — ${fmtBRL(t.valorPorTonelada)}/t` : 'Frete cheio'],
      ['Observação', t.observacao || '—'],
    ],
    theme: 'plain',
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 130, textColor: COLORS.muted }, 1: { textColor: COLORS.ink } },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 18;

  y = drawResultBox(doc, y, receita, despesas, liquido);

  // Despesas por tipo
  const expByType = aggExpensesByType(input.expenses);
  if (expByType.length > 0) {
    y = drawSectionTitle(doc, y, 'Despesas por categoria');
    autoTable(doc, {
      startY: y,
      head: [['Categoria', '% do total', 'Valor']],
      body: expByType.map(([t, v]) => [t, `${((v / despesas) * 100).toFixed(1)}%`, fmtBRL(v)]),
      foot: [['Total', '100%', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 9 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Despesas detalhadas
  if (input.expenses.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, y, 'Despesas detalhadas');
    const expSorted = [...input.expenses].sort((a, b) => a.data.localeCompare(b.data));
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Categoria', 'Descrição', 'Valor']],
      body: expSorted.map(e => [fmtDate(e.data), e.tipo, e.descricao || '—', fmtBRL(e.valor)]),
      foot: [['', '', 'Total', fmtBRL(despesas)]],
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: 255, fontSize: 8 },
      footStyles: { fillColor: COLORS.light, textColor: COLORS.ink, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 90 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 70, halign: 'right', textColor: COLORS.danger, fontStyle: 'bold' } },
      styles: { overflow: 'linebreak', cellWidth: 'wrap' },
      tableWidth: 'auto',
      margin: { left: 40, right: 40 },
    });
  }

  drawFooter(doc);
  return doc.output('blob');
}
