import jsPDF from 'jspdf';
import dashboardImg from '@/assets/guide/dashboard.png';
import viagensImg from '@/assets/guide/viagens.png';
import novaViagemImg from '@/assets/guide/nova-viagem.png';
import contratosImg from '@/assets/guide/contratos.png';
import despesasImg from '@/assets/guide/despesas.png';
import cadastrosImg from '@/assets/guide/cadastros.png';
import safrasImg from '@/assets/guide/safras.png';

// ===== Paleta moderna =====
const PRIMARY: [number, number, number] = [249, 115, 22]; // laranja
const PRIMARY_DARK: [number, number, number] = [194, 65, 12];
const PRIMARY_SOFT: [number, number, number] = [255, 237, 213];
const DARK_BG: [number, number, number] = [17, 24, 39];
const INK: [number, number, number] = [24, 24, 27];
const SUBTLE: [number, number, number] = [113, 113, 122];
const LINE: [number, number, number] = [228, 228, 231];
const SOFT_BG: [number, number, number] = [250, 250, 250];

interface Step {
  n: number;
  tag: string;
  title: string;
  intro: string;
  bullets: string[];
  image: string;
}

// ===== Helpers de cor =====
const fill = (d: jsPDF, c: [number, number, number]) => d.setFillColor(c[0], c[1], c[2]);
const text = (d: jsPDF, c: [number, number, number]) => d.setTextColor(c[0], c[1], c[2]);
const draw = (d: jsPDF, c: [number, number, number]) => d.setDrawColor(c[0], c[1], c[2]);

// ===== Carrega imagens como HTMLImageElement =====
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ===== Conteúdo dos passos =====
const STEPS: Step[] = [
  {
    n: 1,
    tag: 'Comece pelo basico',
    title: 'Cadastros',
    intro:
      'O ponto de partida do RotaSafra. Cadastre uma unica vez seus caminhoes (placa) e produtores. Ja a safra voce cadastra a cada novo periodo de colheita (ex.: Soja 2026, Milho 2026).',
    bullets: [
      'Caminhao: cadastrado uma unica vez pela placa.',
      'Produtor: nome e dados de contato.',
      'Safra: nova entrada a cada novo periodo (ano + cultura).',
      'Acesse pelo menu inferior em "Cadastros".',
    ],
    image: cadastrosImg,
  },
  {
    n: 2,
    tag: 'O pulmao do sistema',
    title: 'Contratos',
    intro:
      'O contrato confirma que voce fechou para puxar a lavoura do produtor. Ele liga produtor + safra + valor por saco e e obrigatorio para registrar viagens de lavoura.',
    bullets: [
      'Crie um contrato por produtor a cada nova safra.',
      'Defina o valor padrao por saco (60 kg).',
      'Acompanhe viagens, sacos e lucro liquido no card.',
      'Ao fim, gere o PDF de fechamento e envie pelo WhatsApp.',
    ],
    image: contratosImg,
  },
  {
    n: 3,
    tag: 'Lance pelo botao + central',
    title: 'Nova Viagem',
    intro:
      'Toque no botao + central para registrar uma viagem. Escolha entre Lavoura (vinculada a um contrato) ou Frete avulso. O sistema reaproveita os dados da viagem anterior para agilizar.',
    bullets: [
      'Pre-preenchimento inteligente da viagem anterior.',
      'Valor por saco flexivel mesmo com contrato ativo.',
      'Suporta peso em KG ou Toneladas.',
      'Funciona offline: sincroniza quando voltar a internet.',
    ],
    image: novaViagemImg,
  },
  {
    n: 4,
    tag: 'Historico completo',
    title: 'Lista de Viagens',
    intro:
      'Visualize todas as viagens registradas com data, rota, contrato, sacos e valor. Toque em uma viagem para editar ou excluir.',
    bullets: [
      'Filtra automaticamente por safra e periodo.',
      'Mostra valor total da viagem em destaque.',
      'Toque para editar; exclusao bloqueada se houver despesas.',
    ],
    image: viagensImg,
  },
  {
    n: 5,
    tag: '3 tipos para controle total',
    title: 'Despesas',
    intro:
      'Existem tres tipos de despesa, cada uma com uma finalidade diferente: por viagem, avulsa e por contrato. Saber a diferenca e essencial para o fechamento correto.',
    bullets: [
      'Por viagem: custos da rota (combustivel, pedagio). Deduz do lucro bruto.',
      'Avulsa: gastos gerais (manutencao, pecas). Deduz do lucro bruto.',
      'Por contrato: ex. abastecimento na fazenda. Abate no fechamento com o produtor.',
    ],
    image: despesasImg,
  },
  {
    n: 6,
    tag: 'Relatorios e fechamento',
    title: 'Safras',
    intro:
      'Acompanhe o desempenho de cada safra com viagens, sacos e liquido consolidados. Acesse os contratos vinculados e gere o relatorio final para envio pelo WhatsApp.',
    bullets: [
      'Resumo consolidado por safra.',
      'Acesso direto aos contratos vinculados.',
      'PDF de fechamento profissional para o produtor.',
    ],
    image: safrasImg,
  },
  {
    n: 7,
    tag: 'Visao geral do negocio',
    title: 'Dashboard',
    intro:
      'O painel inicial traz o liquido em destaque, receita, despesas, total de viagens, sacos transportados e graficos comparativos por mes. Ideal para decidir com dados.',
    bullets: [
      'Liquido da safra em destaque no topo.',
      'Filtros por mes, ano, safra ou frete.',
      'Grafico Receita x Despesa nos ultimos 6 meses.',
    ],
    image: dashboardImg,
  },
];

// ===== Layout helpers =====
function drawHeader(doc: jsPDF, W: number) {
  fill(doc, PRIMARY);
  doc.rect(0, 0, W, 60, 'F');
  fill(doc, PRIMARY_DARK);
  doc.rect(0, 58, W, 2, 'F');
  text(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ROTASAFRA', 40, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('CONTROLE DE FRETES AGRICOLAS', 40, 40);
}

function drawFooter(doc: jsPDF, W: number, H: number, page: number, total: number) {
  draw(doc, LINE);
  doc.setLineWidth(0.5);
  doc.line(40, H - 36, W - 40, H - 36);
  text(doc, SUBTLE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('RotaSafra - Guia de Uso', 40, H - 22);
  doc.text(`Pagina ${page} de ${total}`, W - 40, H - 22, { align: 'right' });
}

export async function generateUserGuidePdf(): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Carrega todas as imagens em paralelo
  const images = await Promise.all(STEPS.map((s) => loadImage(s.image)));

  const totalPages = 2 + STEPS.length + 1; // capa + sumario + passos + fim

  // ============ CAPA ============
  fill(doc, DARK_BG);
  doc.rect(0, 0, W, H, 'F');

  // Faixa lateral laranja
  fill(doc, PRIMARY);
  doc.rect(0, 0, 8, H, 'F');

  // Logo/marca
  text(doc, PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ROTASAFRA', 50, 90);

  text(doc, [200, 200, 210]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('CONTROLE DE FRETES AGRICOLAS', 50, 108);

  // Titulo principal
  text(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(56);
  doc.text('Guia', 50, 280);
  doc.text('de uso.', 50, 340);

  // Sublinhado decorativo
  fill(doc, PRIMARY);
  doc.rect(50, 358, 80, 4, 'F');

  // Resumo
  text(doc, [220, 220, 225]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  const resumo = doc.splitTextToSize(
    'Tudo o que voce precisa para organizar sua operacao de fretes agricolas: caminhoes, produtores, safras, contratos, viagens, despesas e fechamento direto pelo WhatsApp. Este manual mostra cada tela do app e o que ela faz.',
    W - 100,
  );
  doc.text(resumo, 50, 410);

  // Card "Para que serve"
  fill(doc, [30, 41, 59]);
  doc.roundedRect(50, H - 220, W - 100, 140, 14, 14, 'F');
  text(doc, PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PARA QUE SERVE O ROTASAFRA', 70, H - 190);
  text(doc, [240, 240, 245]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const proposito = doc.splitTextToSize(
    'O RotaSafra e o aplicativo do caminhoneiro e do transportador agricola. Controla do primeiro cadastro ao fechamento da safra: lanca viagens em segundos, separa as despesas por tipo, calcula o lucro liquido e gera o relatorio em PDF para enviar ao produtor pelo WhatsApp. Funciona offline no campo e sincroniza quando voltar a internet.',
    W - 140,
  );
  doc.text(proposito, 70, H - 168);

  // Rodape capa
  text(doc, [150, 150, 160]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Manual oficial - v1.0', 50, H - 40);
  doc.text('rotasafra-dev.lovable.app', W - 50, H - 40, { align: 'right' });

  // ============ SUMARIO ============
  doc.addPage();
  drawHeader(doc, W);

  text(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('Sumario', 40, 110);

  text(doc, SUBTLE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Cada secao traz a tela real do aplicativo e os principais pontos de uso.', 40, 130);

  let y = 170;
  STEPS.forEach((s) => {
    // numero grande em laranja claro
    text(doc, PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text(String(s.n).padStart(2, '0'), 40, y);

    // titulo
    text(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(s.title, 90, y - 8);

    // tag
    text(doc, SUBTLE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(s.tag, 90, y + 8);

    // linha pontilhada (simulada com underscore)
    draw(doc, LINE);
    doc.setLineDashPattern([1, 2], 0);
    doc.line(90, y + 16, W - 70, y + 16);
    doc.setLineDashPattern([], 0);

    // numero da pagina
    text(doc, SUBTLE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(s.n + 2), W - 50, y + 4, { align: 'right' });

    y += 56;
  });

  drawFooter(doc, W, H, 2, totalPages);

  // ============ PASSOS (1 por pagina) ============
  STEPS.forEach((step, idx) => {
    doc.addPage();
    drawHeader(doc, W);

    // Tag
    fill(doc, PRIMARY_SOFT);
    doc.roundedRect(40, 90, doc.getTextWidth(`PASSO ${step.n} / ${STEPS.length}`) + 22, 22, 11, 11, 'F');
    text(doc, PRIMARY_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`PASSO ${step.n} / ${STEPS.length}`, 51, 105);

    // Titulo
    text(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(34);
    doc.text(step.title, 40, 150);

    // Subtag
    text(doc, PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(step.tag.toUpperCase(), 40, 172);

    // ===== Coluna esquerda: imagem real do app =====
    const img = images[idx];
    const maxImgW = 200;
    const maxImgH = 420;
    const ratio = img.width / img.height;
    let imgW = maxImgW;
    let imgH = imgW / ratio;
    if (imgH > maxImgH) {
      imgH = maxImgH;
      imgW = imgH * ratio;
    }
    const imgX = 40;
    const imgY = 200;

    // sombra
    fill(doc, [0, 0, 0]);
    doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.roundedRect(imgX + 4, imgY + 6, imgW, imgH, 12, 12, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // moldura
    fill(doc, [255, 255, 255]);
    draw(doc, LINE);
    doc.setLineWidth(0.8);
    doc.roundedRect(imgX, imgY, imgW, imgH, 12, 12, 'FD');

    // imagem
    doc.addImage(img, 'PNG', imgX + 4, imgY + 4, imgW - 8, imgH - 8);

    // Legenda
    text(doc, SUBTLE);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(`Tela real do app: ${step.title}`, imgX + imgW / 2, imgY + imgH + 18, { align: 'center' });

    // ===== Coluna direita: conteudo =====
    const cx = 270;
    const cw = W - cx - 40;
    let cy = 210;

    // Descricao
    text(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Como funciona', cx, cy);
    cy += 18;

    text(doc, [60, 60, 70]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const intro = doc.splitTextToSize(step.intro, cw);
    doc.text(intro, cx, cy);
    cy += intro.length * 14 + 18;

    // Pontos-chave
    text(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Pontos-chave', cx, cy);
    cy += 16;

    step.bullets.forEach((b) => {
      // marcador laranja
      fill(doc, PRIMARY);
      doc.roundedRect(cx, cy - 7, 3, 12, 1, 1, 'F');
      text(doc, [50, 50, 60]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const lines = doc.splitTextToSize(b, cw - 12);
      doc.text(lines, cx + 10, cy);
      cy += lines.length * 14 + 6;
    });

    drawFooter(doc, W, H, step.n + 2, totalPages);
  });

  // ============ ENCERRAMENTO ============
  doc.addPage();
  fill(doc, DARK_BG);
  doc.rect(0, 0, W, H, 'F');
  fill(doc, PRIMARY);
  doc.rect(0, 0, 8, H, 'F');

  text(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  doc.text('Pronto para', 50, 220);
  doc.text('comecar.', 50, 270);

  fill(doc, PRIMARY);
  doc.rect(50, 290, 80, 4, 'F');

  text(doc, [220, 220, 225]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  const fim = doc.splitTextToSize(
    'Voce ja conhece o fluxo completo do RotaSafra. Lembre-se da ordem ideal: Cadastros -> Contratos -> Viagens -> Despesas -> Fechamento. O app funciona offline no campo e sincroniza assim que voltar o sinal.',
    W - 100,
  );
  doc.text(fim, 50, 340);

  // Card ajuda
  fill(doc, [30, 41, 59]);
  doc.roundedRect(50, H - 240, W - 100, 140, 14, 14, 'F');
  text(doc, PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PRECISA DE AJUDA NOVAMENTE?', 70, H - 210);
  text(doc, [240, 240, 245]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const help = doc.splitTextToSize(
    'Toque no icone de interrogacao no topo do aplicativo para abrir a Central de Ajuda, refazer o tour guiado ou baixar este guia em PDF novamente. Voce tambem encontra perguntas frequentes e dicas de uso por la.',
    W - 140,
  );
  doc.text(help, 70, H - 188);

  text(doc, [150, 150, 160]);
  doc.setFontSize(9);
  doc.text('RotaSafra - Bom trabalho e boas estradas!', 50, H - 40);
  doc.text(`Pagina ${totalPages} de ${totalPages}`, W - 50, H - 40, { align: 'right' });

  return doc.output('blob');
}

export async function downloadUserGuidePdf() {
  const blob = await generateUserGuidePdf();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RotaSafra-Guia-de-Uso.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
