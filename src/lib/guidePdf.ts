import jsPDF from 'jspdf';

// Cores (RGB)
const PRIMARY: [number, number, number] = [249, 115, 22]; // laranja RotaSafra
const PRIMARY_SOFT: [number, number, number] = [255, 237, 213];
const INK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [115, 115, 115];
const BORDER: [number, number, number] = [220, 220, 220];
const BG_CARD: [number, number, number] = [250, 250, 250];

interface ScreenStep {
  n: number;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  // mock screen builder
  draw: (doc: jsPDF, x: number, y: number, w: number, h: number) => void;
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

function roundedCard(doc: jsPDF, x: number, y: number, w: number, h: number, fill?: [number, number, number]) {
  if (fill) setFill(doc, fill);
  setDraw(doc, BORDER);
  doc.roundedRect(x, y, w, h, 8, 8, fill ? 'FD' : 'D');
}

// ----- Mockups das telas -----

function drawPhoneFrame(doc: jsPDF, x: number, y: number, w: number, h: number) {
  setFill(doc, [245, 245, 247]);
  setDraw(doc, [200, 200, 205]);
  doc.roundedRect(x, y, w, h, 14, 14, 'FD');
  // notch
  setFill(doc, [200, 200, 205]);
  doc.roundedRect(x + w / 2 - 18, y + 6, 36, 4, 2, 2, 'F');
}

function drawDashboardScreen(doc: jsPDF, x: number, y: number, w: number, h: number) {
  drawPhoneFrame(doc, x, y, w, h);
  const px = x + 10, py = y + 18, pw = w - 20;
  // header
  setFill(doc, PRIMARY);
  doc.roundedRect(px, py, pw, 38, 6, 6, 'F');
  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('LÍQUIDO DA SAFRA', px + 8, py + 12);
  doc.setFontSize(14);
  doc.text('R$ 24.580,00', px + 8, py + 28);
  // stats
  let cy = py + 46;
  for (let i = 0; i < 2; i++) {
    setFill(doc, BG_CARD); setDraw(doc, BORDER);
    doc.roundedRect(px, cy, pw / 2 - 3, 26, 4, 4, 'FD');
    doc.roundedRect(px + pw / 2 + 3, cy, pw / 2 - 3, 26, 4, 4, 'FD');
    cy += 30;
  }
  // chart bars
  setFill(doc, BG_CARD); setDraw(doc, BORDER);
  doc.roundedRect(px, cy, pw, h - (cy - y) - 30, 4, 4, 'FD');
  setFill(doc, PRIMARY);
  for (let i = 0; i < 5; i++) {
    const bh = 8 + i * 4;
    doc.rect(px + 8 + i * 14, cy + (h - (cy - y) - 30) - bh - 4, 8, bh, 'F');
  }
  // tab bar
  setFill(doc, [255, 255, 255]); setDraw(doc, BORDER);
  doc.roundedRect(px, y + h - 22, pw, 16, 4, 4, 'FD');
  setFill(doc, PRIMARY);
  doc.circle(px + 10, y + h - 14, 2, 'F');
  setFill(doc, [200, 200, 200]);
  for (let i = 1; i < 5; i++) doc.circle(px + 10 + i * (pw / 5), y + h - 14, 2, 'F');
}

function drawCadastrosScreen(doc: jsPDF, x: number, y: number, w: number, h: number) {
  drawPhoneFrame(doc, x, y, w, h);
  const px = x + 10, py = y + 18, pw = w - 20;
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Cadastros', px, py + 8);
  let cy = py + 16;
  const items = ['Caminhões', 'Produtores', 'Safras'];
  items.forEach((it) => {
    setFill(doc, BG_CARD); setDraw(doc, BORDER);
    doc.roundedRect(px, cy, pw, 28, 6, 6, 'FD');
    setFill(doc, PRIMARY_SOFT);
    doc.roundedRect(px + 6, cy + 6, 16, 16, 3, 3, 'F');
    setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(it, px + 28, cy + 13);
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('Toque para gerenciar', px + 28, cy + 21);
    cy += 32;
  });
}

function drawContractsScreen(doc: jsPDF, x: number, y: number, w: number, h: number) {
  drawPhoneFrame(doc, x, y, w, h);
  const px = x + 10, py = y + 18, pw = w - 20;
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Contratos', px, py + 8);
  let cy = py + 16;
  for (let i = 0; i < 3; i++) {
    setFill(doc, BG_CARD); setDraw(doc, BORDER);
    doc.roundedRect(px, cy, pw, 36, 6, 6, 'FD');
    setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(`Produtor ${i + 1}`, px + 6, cy + 10);
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('Soja 2025 • R$ 95/saco', px + 6, cy + 18);
    setFill(doc, PRIMARY);
    doc.roundedRect(px + pw - 38, cy + 8, 32, 14, 3, 3, 'F');
    setText(doc, [255, 255, 255]); doc.setFontSize(6);
    doc.text('ABERTO', px + pw - 34, cy + 17);
    cy += 40;
  }
}

function drawTripFormScreen(doc: jsPDF, x: number, y: number, w: number, h: number) {
  drawPhoneFrame(doc, x, y, w, h);
  const px = x + 10, py = y + 18, pw = w - 20;
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Nova Viagem', px, py + 8);
  let cy = py + 16;
  const fields = ['Data', 'Caminhão', 'Origem', 'Destino', 'Sacos'];
  fields.forEach((f) => {
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(f, px, cy + 4);
    setFill(doc, BG_CARD); setDraw(doc, BORDER);
    doc.roundedRect(px, cy + 6, pw, 14, 3, 3, 'FD');
    cy += 24;
  });
  setFill(doc, PRIMARY);
  doc.roundedRect(px, y + h - 28, pw, 18, 4, 4, 'F');
  setText(doc, [255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('SALVAR VIAGEM', px + pw / 2, y + h - 17, { align: 'center' });
}

function drawExpensesScreen(doc: jsPDF, x: number, y: number, w: number, h: number) {
  drawPhoneFrame(doc, x, y, w, h);
  const px = x + 10, py = y + 18, pw = w - 20;
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Despesas', px, py + 8);
  let cy = py + 16;
  const items = [
    ['Combustível', 'R$ 480,00', 'Por viagem'],
    ['Manutenção', 'R$ 1.200,00', 'Avulsa'],
    ['Abastecimento fazenda', 'R$ 350,00', 'Por contrato'],
  ];
  items.forEach(([t, v, k]) => {
    setFill(doc, BG_CARD); setDraw(doc, BORDER);
    doc.roundedRect(px, cy, pw, 30, 6, 6, 'FD');
    setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(t, px + 6, cy + 11);
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(k, px + 6, cy + 20);
    setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(v, px + pw - 6, cy + 16, { align: 'right' });
    cy += 34;
  });
}

function drawHarvestsScreen(doc: jsPDF, x: number, y: number, w: number, h: number) {
  drawPhoneFrame(doc, x, y, w, h);
  const px = x + 10, py = y + 18, pw = w - 20;
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Safras', px, py + 8);
  let cy = py + 16;
  const items = ['Soja 2025', 'Milho 2025', 'Sorgo 2024'];
  items.forEach((it) => {
    setFill(doc, BG_CARD); setDraw(doc, BORDER);
    doc.roundedRect(px, cy, pw, 30, 6, 6, 'FD');
    setFill(doc, PRIMARY_SOFT);
    doc.roundedRect(px + 6, cy + 6, 18, 18, 3, 3, 'F');
    setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(it, px + 30, cy + 13);
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text('3 contratos • 12 viagens', px + 30, cy + 21);
    cy += 34;
  });
}

const STEPS: ScreenStep[] = [
  {
    n: 1,
    title: 'Cadastros',
    subtitle: 'Comece pelo básico',
    description:
      'Cadastre uma única vez seus caminhões e produtores. As safras você cadastra a cada novo período (ex.: Soja 2025, Milho 2025).',
    bullets: [
      'Caminhão: cadastre a placa apenas uma vez',
      'Produtor: nome e dados de contato',
      'Safra: criada a cada novo período de colheita',
    ],
    draw: drawCadastrosScreen,
  },
  {
    n: 2,
    title: 'Contratos',
    subtitle: 'O pulmão do sistema',
    description:
      'O contrato confirma que você fechou para puxar a lavoura do produtor. Vincula produtor + safra + valor por saco. Toda viagem de lavoura precisa de um contrato.',
    bullets: [
      'Crie um contrato por safra/produtor',
      'Defina o valor padrão por saco',
      'Acompanhe lucro e número de viagens no card',
    ],
    draw: drawContractsScreen,
  },
  {
    n: 3,
    title: 'Viagens',
    subtitle: 'Lance no botão + central',
    description:
      'Toque no + para registrar uma viagem de Lavoura (vinculada a um contrato) ou Frete avulso. O sistema pré-preenche os campos da viagem anterior para agilizar.',
    bullets: [
      'Pré-preenchimento inteligente da viagem anterior',
      'Valor por saco flexível mesmo com contrato fechado',
      'Funciona offline — sincroniza depois',
    ],
    draw: drawTripFormScreen,
  },
  {
    n: 4,
    title: 'Despesas',
    subtitle: '3 tipos para controle total',
    description:
      'Despesa por viagem (custos da rota), avulsa (gastos gerais, ex.: manutenção) e por contrato (ex.: abastecimento na fazenda — abate no fechamento com o produtor).',
    bullets: [
      'Por viagem: deduz do lucro bruto',
      'Avulsa: gastos gerais de operação',
      'Por contrato: abate no fechamento do produtor',
    ],
    draw: drawExpensesScreen,
  },
  {
    n: 5,
    title: 'Safras & Fechamento',
    subtitle: 'Relatórios e WhatsApp',
    description:
      'Acompanhe o desempenho de cada safra e gere o PDF de fechamento para enviar direto ao produtor pelo WhatsApp.',
    bullets: [
      'Relatórios consolidados por safra',
      'PDF de fechamento profissional',
      'Compartilhamento direto pelo WhatsApp',
    ],
    draw: drawHarvestsScreen,
  },
  {
    n: 6,
    title: 'Dashboard',
    subtitle: 'Visão geral do seu negócio',
    description:
      'O painel principal traz líquido da safra, número de viagens, sacos transportados e gráficos comparativos para você decidir com dados.',
    bullets: [
      'Líquido em destaque no topo',
      'Filtros por período',
      'Gráficos de desempenho',
    ],
    draw: drawDashboardScreen,
  },
];

export function generateUserGuidePdf(): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ============ CAPA ============
  setFill(doc, PRIMARY);
  doc.rect(0, 0, W, H, 'F');

  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(48);
  doc.text('RotaSafra', 40, 180);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(16);
  doc.text('Guia completo de uso do aplicativo', 40, 210);

  // box info
  setFill(doc, [255, 255, 255]);
  doc.roundedRect(40, 280, W - 80, 220, 12, 12, 'F');
  setText(doc, INK);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('Para que serve o RotaSafra?', 60, 320);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
  setText(doc, [60, 60, 60]);
  const intro = doc.splitTextToSize(
    'O RotaSafra é o aplicativo que organiza, do começo ao fim, a operação de quem trabalha com fretes agrícolas. Ele controla caminhões, produtores, safras, contratos, viagens e despesas — e ainda gera o PDF de fechamento pronto para enviar ao produtor pelo WhatsApp. Tudo funciona offline no campo e sincroniza automaticamente quando você volta a ter internet.',
    W - 120,
  );
  doc.text(intro, 60, 350);

  setText(doc, PRIMARY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('CONTROLE DE FRETES AGRÍCOLAS', 60, 480);

  setText(doc, [255, 255, 255]); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Manual oficial • v1.0', 40, H - 40);
  doc.text('rotasafra-dev.lovable.app', W - 40, H - 40, { align: 'right' });

  // ============ ÍNDICE ============
  doc.addPage();
  setFill(doc, PRIMARY);
  doc.rect(0, 0, W, 70, 'F');
  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text('Sumário', 40, 45);

  setText(doc, INK);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13);
  let yIdx = 110;
  STEPS.forEach((s) => {
    setText(doc, PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${String(s.n).padStart(2, '0')}`, 40, yIdx);
    setText(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.text(s.title, 80, yIdx);
    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(s.subtitle, 80, yIdx + 14);
    doc.setFontSize(13);
    yIdx += 38;
  });

  // dica
  setFill(doc, PRIMARY_SOFT);
  doc.roundedRect(40, yIdx + 20, W - 80, 80, 10, 10, 'F');
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Dica de leitura', 56, yIdx + 42);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  setText(doc, [60, 60, 60]);
  const tip = doc.splitTextToSize(
    'Cada seção mostra a tela do aplicativo, o que ela faz e os principais pontos para você executar a tarefa em poucos toques. Siga a ordem dos cadastros → contratos → viagens → fechamento para um fluxo sem travamentos.',
    W - 110,
  );
  doc.text(tip, 56, yIdx + 60);

  // ============ PASSOS ============
  STEPS.forEach((step) => {
    doc.addPage();

    // header da página
    setFill(doc, PRIMARY);
    doc.rect(0, 0, W, 70, 'F');
    setText(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(`PASSO ${String(step.n).padStart(2, '0')} DE ${STEPS.length}`, 40, 28);
    doc.setFontSize(22);
    doc.text(step.title, 40, 52);

    // ----- coluna esquerda: tela -----
    const screenW = 200;
    const screenH = 380;
    const screenX = 40;
    const screenY = 100;
    step.draw(doc, screenX, screenY, screenW, screenH);

    setText(doc, MUTED);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
    doc.text(`Tela: ${step.title}`, screenX + screenW / 2, screenY + screenH + 16, { align: 'center' });

    // ----- coluna direita: conteúdo -----
    const cx = 270;
    const cw = W - cx - 40;
    let cy = 110;

    setText(doc, PRIMARY);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(step.subtitle.toUpperCase(), cx, cy);
    cy += 18;

    setText(doc, INK);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text(step.title, cx, cy);
    cy += 24;

    setText(doc, [60, 60, 60]);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    const desc = doc.splitTextToSize(step.description, cw);
    doc.text(desc, cx, cy);
    cy += desc.length * 14 + 12;

    // bullets card
    setFill(doc, PRIMARY_SOFT);
    setDraw(doc, PRIMARY_SOFT);
    const cardH = step.bullets.length * 22 + 30;
    doc.roundedRect(cx, cy, cw, cardH, 8, 8, 'F');

    setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('PONTOS-CHAVE', cx + 14, cy + 18);

    let by = cy + 36;
    step.bullets.forEach((b) => {
      setFill(doc, PRIMARY);
      doc.circle(cx + 18, by - 3, 2.5, 'F');
      setText(doc, INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      const lines = doc.splitTextToSize(b, cw - 36);
      doc.text(lines, cx + 28, by);
      by += 22;
    });

    // footer
    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`RotaSafra • Guia de uso`, 40, H - 24);
    doc.text(`${step.n} / ${STEPS.length}`, W - 40, H - 24, { align: 'right' });
  });

  // ============ ENCERRAMENTO ============
  doc.addPage();
  setFill(doc, PRIMARY);
  doc.rect(0, 0, W, H, 'F');
  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(34);
  doc.text('Pronto para começar!', 40, 200);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13);
  const out = doc.splitTextToSize(
    'Agora você conhece todas as telas e o fluxo do RotaSafra. Lembre-se: o app funciona no campo mesmo sem internet, e tudo sincroniza assim que voltar a ter sinal. Bom trabalho e boas estradas!',
    W - 80,
  );
  doc.text(out, 40, 240);

  setFill(doc, [255, 255, 255]);
  doc.roundedRect(40, 380, W - 80, 110, 12, 12, 'F');
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('Precisa de ajuda novamente?', 60, 414);
  setText(doc, [60, 60, 60]); doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text('Toque no ícone de interrogação no topo do aplicativo para abrir', 60, 438);
  doc.text('a Central de Ajuda, refazer o tour guiado ou baixar este guia novamente.', 60, 454);

  return doc.output('blob');
}

export function downloadUserGuidePdf() {
  const blob = generateUserGuidePdf();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RotaSafra-Guia-de-Uso.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
