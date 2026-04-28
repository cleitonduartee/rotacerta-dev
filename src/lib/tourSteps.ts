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
    title: 'Bem-vindo ao RotaCerta!',
    body: 'Em menos de 1 minuto vamos te mostrar como organizar viagens, safras e despesas. Você pode pular a qualquer momento.',
  },
  {
    selector: '[data-tour="tab-cadastros"]',
    title: '1. Comece pelos cadastros',
    body: 'Aqui você cadastra produtores, caminhões, motoristas e safras. É a base para tudo no app.',
    placement: 'top',
  },
  {
    selector: '[data-tour="tab-contratos"]',
    title: '2. Crie um contrato',
    body: 'Vincule um produtor a uma safra e defina o valor por saco. Cada viagem de lavoura usa um contrato.',
    placement: 'top',
  },
  {
    selector: '[data-tour="fab-nova-viagem"]',
    title: '3. Registre uma viagem',
    body: 'Toque no + para lançar viagens de lavoura (vinculadas a um contrato) ou fretes avulsos.',
    placement: 'top',
  },
  {
    selector: '[data-tour="tab-despesas"]',
    title: '4. Lance suas despesas',
    body: 'Combustível, pedágio, manutenção... Tudo aqui. O lucro líquido é calculado automaticamente.',
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
