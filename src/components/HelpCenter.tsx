import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PlayCircle, BookOpen, HelpCircle, WifiOff, Truck, Receipt, FileSignature, FileText, Wheat } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStartTour: () => void;
}

export function HelpCenter({ open, onOpenChange, onStartTour }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0">
        <SheetHeader className="border-b border-border bg-gradient-to-br from-primary/10 to-transparent p-5 text-left">
          <SheetTitle className="font-display text-2xl">Central de Ajuda</SheetTitle>
          <SheetDescription>Aprenda a usar o RotaCerta em poucos minutos.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-5">
          {/* Refazer tour */}
          <button
            onClick={() => {
              onOpenChange(false);
              setTimeout(onStartTour, 200);
            }}
            className="flex w-full items-center gap-3 rounded-xl gradient-primary p-4 text-left text-primary-foreground shadow-elevated active:scale-[0.99] transition-transform"
          >
            <PlayCircle className="h-8 w-8 shrink-0" />
            <div>
              <p className="font-display text-lg leading-tight">Refazer tour guiado</p>
              <p className="text-xs opacity-90">Tour rápido pelas principais telas</p>
            </div>
          </button>

          {/* Guia rápido */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg">Guia rápido</h3>
            </div>
            <ol className="space-y-3">
              <GuideStep n={1} icon={FileText} title="Cadastros">
                Cadastre <strong>produtores</strong>, <strong>caminhões</strong>, <strong>motoristas</strong> e <strong>safras</strong>. Sem isso você não consegue criar contratos nem viagens.
              </GuideStep>
              <GuideStep n={2} icon={FileSignature} title="Contratos">
                Crie um contrato vinculando <strong>produtor + safra + valor por saco</strong>. Toda viagem de lavoura precisa estar ligada a um contrato.
              </GuideStep>
              <GuideStep n={3} icon={Truck} title="Viagens">
                Toque no botão <strong>+</strong> central para registrar uma viagem. Escolha entre <strong>Lavoura</strong> (usa contrato) ou <strong>Frete avulso</strong> (transportadora livre).
              </GuideStep>
              <GuideStep n={4} icon={Receipt} title="Despesas">
                Lance custos como combustível, pedágio e manutenção. Eles entram no cálculo do <strong>lucro líquido</strong>.
              </GuideStep>
              <GuideStep n={5} icon={Wheat} title="Fechamento e WhatsApp">
                Ao fechar uma safra ou contrato, o app gera um <strong>PDF de fechamento</strong> que pode ser enviado direto para o produtor pelo WhatsApp.
              </GuideStep>
            </ol>
          </section>

          {/* FAQ */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg">Perguntas frequentes</h3>
            </div>
            <Accordion type="single" collapsible className="rounded-xl border border-border bg-card">
              <FAQ q="Por que não consigo excluir uma safra ou produtor?">
                O sistema bloqueia exclusões que quebrariam relatórios. Se uma safra tem contratos vinculados, ou um produtor tem contratos, ou um contrato tem viagens, você precisa excluir primeiro os registros dependentes.
              </FAQ>
              <FAQ q="O app funciona sem internet?">
                Sim. Tudo é salvo no seu aparelho e sincroniza automaticamente quando voltar a ter conexão. Quando estiver offline, aparece um aviso amarelo no topo.
              </FAQ>
              <FAQ q="Como envio o fechamento ao produtor?">
                Na tela de Contratos, toque no ícone do WhatsApp ao lado do contrato. O app gera um PDF e abre o WhatsApp já com a mensagem de resumo. No celular, o PDF vai junto; no desktop, ele é baixado e você anexa manualmente.
              </FAQ>
              <FAQ q="Qual a diferença entre 'Lavoura' e 'Frete avulso'?">
                <strong>Lavoura</strong> é viagem de safra: usa um contrato cadastrado e calcula valor pelo número de sacos. <strong>Frete avulso</strong> é qualquer outro frete (terceiros), com transportadora e valor livre.
              </FAQ>
              <FAQ q="Como mudo um contrato já fechado?">
                Reabra-o em Contratos (ícone de cadeado). Depois de reaberto, ele aceita novas viagens e edições.
              </FAQ>
              <FAQ q="Onde vejo o lucro de cada safra?">
                Em Cadastros → Safras, toque na safra. Você verá viagens, sacos, receita, despesas e líquido consolidados.
              </FAQ>
              <FAQ q="Excluí algo por engano. Como recupero?">
                A exclusão é definitiva. Recomendamos fechar contratos em vez de excluí-los — assim os dados ficam preservados para histórico.
              </FAQ>
            </Accordion>
          </section>

          {/* Offline */}
          <section className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-warning">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">Modo offline</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pode usar no campo sem sinal. Tudo sincroniza quando voltar à internet.
            </p>
          </section>

          <p className="pt-2 text-center text-[10px] text-muted-foreground/60">
            RotaCerta • Estrada na palma da mão
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GuideStep({
  n,
  icon: Icon,
  title,
  children,
}: {
  n: number;
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">
          <span className="text-primary">{n}.</span> {title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={q} className="border-b border-border last:border-b-0 px-3">
      <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">{q}</AccordionTrigger>
      <AccordionContent className="text-xs text-muted-foreground leading-relaxed">{children}</AccordionContent>
    </AccordionItem>
  );
}
