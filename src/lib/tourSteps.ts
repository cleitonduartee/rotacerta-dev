export type TourStep = {
  /** Seletor CSS do elemento a destacar. Se ausente, mostra balão centralizado. */
  selector?: string;
  title: string;
  body: string;
  /** Posição preferida do balão em relação ao alvo */
  placement?: 'top' | 'bottom' | 'auto';
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao RotaSafra!',
    body: 'Em menos de 1 minuto vamos te mostrar como organizar viagens, safras e despesas. Você pode pular a qualquer momento.',
  },
  {
    selector: '[data-tour="tab-cadastros"]',
    title: '1. Comece pelos cadastros',
    body: 'Placa do caminhão e produtor são cadastrados uma única vez (pode incluir novos depois). Já a safra é cadastrada a cada novo período: colheita do milho? Cadastre "Milho 2025". Começou a soja? Cadastre a safra da soja. E assim por diante.',
    placement: 'top',
  },
  {
    selector: '[data-tour="tab-contratos"]',
    title: '2. Crie um contrato',
    body: 'O contrato é o pulmão do sistema: confirma que você fechou para puxar a lavoura do produtor. A cada nova safra é preciso criar um novo contrato, vinculando produtor + safra + valor por saco.',
    placement: 'top',
  },
  {
    selector: '[data-tour="fab-nova-viagem"]',
    title: '3. Registre uma viagem',
    body: 'Toque no + para lançar viagens de Lavoura (vinculadas a um contrato) ou Frete avulso. O sistema pré-preenche os campos da viagem anterior para agilizar, e você pode mudar o valor por saco mesmo se o contrato tiver um padrão.',
    placement: 'top',
  },
  {
    selector: '[data-tour="tab-despesas"]',
    title: '4. Lance suas despesas',
    body: 'São 3 tipos: por viagem (custos da rota, deduz do lucro bruto), avulsa (gastos gerais como manutenção, também deduz do lucro), e por contrato (ex.: abastecimento na fazenda) — esta abate no fechamento com o produtor.',
    placement: 'top',
  },
  {
    selector: '[data-tour="header-help"]',
    title: '5. Ajuda quando precisar',
    body: 'Toque no ícone de interrogação a qualquer momento para refazer este tour ou tirar dúvidas.',
    placement: 'bottom',
  },
  {
    title: 'Pronto para começar!',
    body: 'Funciona offline — pode usar no campo sem internet, que tudo sincroniza depois. Bom trabalho!',
  },
];

export const TOUR_FLAG_PREFIX = 'rotacerta:tourDone:';
