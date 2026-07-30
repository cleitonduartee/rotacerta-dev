import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, deleteWithTombstone } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtNum, fmtDate } from '@/lib/format';
import { Plus, Trash2, Lock, Unlock, FileDown, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { generateHarvestReport, shareWhatsApp } from '@/lib/report';
import { maskMoneyInput, parseMoney } from '@/lib/masks';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { BlockedDeleteDialog } from '@/components/BlockedDeleteDialog';

export default function ContractsPage() {
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const drivers = useLiveQuery(() => db.drivers.toArray(), []) ?? [];

  const [producerId, setProducerId] = useState<number | ''>('');
  const [harvestId, setHarvestId] = useState<number | ''>('');
  const [valor, setValor] = useState('');
  const [toDelete, setToDelete] = useState<{ id: number; produtor: string; safra: string } | null>(null);
  const [toClose, setToClose] = useState<{ id: number; produtor: string; safra: string } | null>(null);
  const [askSend, setAskSend] = useState<{ contract: any; produtor: string; safra: string } | null>(null);
  const [blocked, setBlocked] = useState<{ title: string; message: React.ReactNode } | null>(null);
  const [openExpanded, setOpenExpanded] = useState(false);
  const [closedExpanded, setClosedExpanded] = useState(false);

  const openContracts = contracts.filter(c => !c.fechado);
  const closedContracts = contracts.filter(c => c.fechado);

  async function add() {
    if (!producerId || !harvestId || !valor) return toast.error('Preencha todos os campos');
    const v = parseMoney(valor);
    if (!v) return toast.error('Valor inválido');
    try {
      const exists = contracts.find(c => c.producerId === Number(producerId) && c.harvestId === Number(harvestId));
      if (exists) return toast.error('Já existe contrato para este produtor + safra');
      await db.contracts.add({
        producerId: Number(producerId),
        harvestId: Number(harvestId),
        valorPorSaco: v,
        fechado: false,
        ...stamp(),
      });
      setValor('');
      toast.success('Contrato salvo');
    } catch (e: any) {
      console.error('[contracts.add] erro', e);
      toast.error('Não foi possível salvar', { description: e?.message ?? String(e) });
    }
  }

  function askRemove(c: any) {
    const p = producers.find(pp => pp.id === c.producerId);
    const h = harvests.find(hh => hh.id === c.harvestId);
    const nome = p?.nome ?? '?';
    const safraNome = h?.nome ?? '?';
    const nViagens = trips.filter(t => t.kind === 'safra' && t.contractId === c.id).length;
    const tripIds = new Set(
      trips.filter(t => t.kind === 'safra' && t.contractId === c.id).map(t => t.id),
    );
    const nDespesas = expenses.filter(e => e.contractId === c.id || (e.tripId && tripIds.has(e.tripId))).length;
    if (nViagens > 0 || nDespesas > 0) {
      const partes: string[] = [];
      if (nViagens > 0) partes.push(`${nViagens} ${nViagens === 1 ? 'viagem' : 'viagens'}`);
      if (nDespesas > 0) partes.push(`${nDespesas} ${nDespesas === 1 ? 'despesa' : 'despesas'}`);
      return setBlocked({
        title: 'Não é possível excluir o contrato',
        message: (
          <>
            O contrato de <strong>{nome}</strong> na safra <strong>{safraNome}</strong> possui{' '}
            <strong>{partes.join(' e ')}</strong> vinculadas. Exclua os registros vinculados antes de remover o contrato.
          </>
        ),
      });
    }
    setToDelete({ id: c.id, produtor: nome, safra: safraNome });
  }
  async function confirmRemove() {
    if (!toDelete) return;
    await deleteWithTombstone('contracts', toDelete.id);
    toast.success('Contrato excluído');
    setToDelete(null);
  }

  function askFechar(c: any) {
    const p = producers.find(pp => pp.id === c.producerId);
    const h = harvests.find(hh => hh.id === c.harvestId);
    setToClose({ id: c.id, produtor: p?.nome ?? '?', safra: h?.nome ?? '?' });
  }
  async function confirmFechar() {
    if (!toClose) return;
    const id = toClose.id;
    const produtor = toClose.produtor;
    const safra = toClose.safra;
    await db.contracts.update(id, { fechado: true, fechadoEm: Date.now(), ...stamp() });
    toast.success('Contrato fechado');
    setToClose(null);
    const c = await db.contracts.get(id);
    if (c) setAskSend({ contract: c, produtor, safra });
  }

  async function reabrir(id: number) {
    await db.contracts.update(id, { fechado: false, fechadoEm: undefined, ...stamp() });
    toast.success('Contrato reaberto');
  }

  function calcContrato(cId: number) {
    const ts = trips.filter(t => t.kind === 'safra' && t.contractId === cId);
    const sacos = ts.reduce((s, t) => s + (t.sacos || 0), 0);
    const receita = ts.reduce((s, t) => s + t.valorTotal, 0);
    return { viagens: ts.length, sacos, receita, trips: ts };
  }

  async function buildContractPdf(c: any): Promise<{ blob: Blob; filename: string } | null> {
    const harvest = harvests.find(h => h.id === c.harvestId);
    if (!harvest) return null;
    const r = calcContrato(c.id);
    const tripIds = new Set(r.trips.map(t => t.id));
    const exps = expenses.filter(e =>
      e.contractId === c.id ||
      (e.tripId && tripIds.has(e.tripId))
    );
    const totalToneladas = (r.sacos * 60) / 1000;
    const despesas = exps.reduce((s, e) => s + e.valor, 0);
    const blob = await generateHarvestReport({
      driver: drivers[0],
      harvest,
      contracts: [c],
      producers,
      trips: r.trips,
      expenses: exps,
      trucks,
      totals: {
        totalSacos: r.sacos,
        totalToneladas,
        receita: r.receita,
        despesas,
        liquido: r.receita - despesas,
      },
    });
    const p = producers.find(p => p.id === c.producerId);
    const filename = `contrato-${p?.nome ?? 'produtor'}-${harvest.nome}.pdf`.replace(/\s+/g, '-');
    return { blob, filename };
  }

  async function pdfContrato(c: any) {
    const out = await buildContractPdf(c);
    if (!out) return;
    const url = URL.createObjectURL(out.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = out.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildResumoMensagem(c: any) {
    const harvest = harvests.find(h => h.id === c.harvestId);
    const p = producers.find(p => p.id === c.producerId);
    const r = calcContrato(c.id);
    const tripIds = new Set(r.trips.map(t => t.id));
    const exps = expenses.filter(e =>
      e.contractId === c.id ||
      (e.tripId && tripIds.has(e.tripId))
    );
    const despesas = exps.reduce((s, e) => s + e.valor, 0);
    const liquido = r.receita - despesas;

    const tripsOrd = [...r.trips].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    const linhasViagens = tripsOrd.map((t, i) => {
      const sacos = t.sacos ?? 0;
      const nota = t.numeroNota ? ` • Nota ${t.numeroNota}` : '';
      const peso = t.pesoKg ? ` • ${fmtNum(t.pesoKg / 1000, 2)}t` : '';
      return `${i + 1}. ${fmtDate(t.data)}${peso} • ${fmtNum(sacos, 2)} sc • ${fmtBRL(t.valorTotal)}${nota}`;
    }).join('\n');

    const porTipo = new Map<string, number>();
    for (const e of exps) porTipo.set(e.tipo || 'Outros', (porTipo.get(e.tipo || 'Outros') ?? 0) + (e.valor || 0));
    const linhasDesp = [...porTipo.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, v]) => `  - ${tipo}: ${fmtBRL(v)}`)
      .join('\n');

    return (
      `*Fechamento de contrato*\n` +
      `Produtor: ${p?.nome}\n` +
      `Safra: ${harvest?.nome} (${harvest?.tipo})\n` +
      `Valor / saco: ${fmtBRL(c.valorPorSaco)}\n` +
      `\n*Viagens (${r.viagens})*\n${linhasViagens || '—'}\n` +
      `\nTotal sacos (60kg): ${fmtNum(r.sacos, 2)}\n` +
      `*Receita: ${fmtBRL(r.receita)}*\n` +
      (exps.length > 0
        ? `\n*Despesas: ${fmtBRL(despesas)}*\n${linhasDesp}\n`
        : '') +
      `\n*LÍQUIDO: ${fmtBRL(liquido)}*`
    );
  }

  async function shareContractPdf(c: any) {
    const out = await buildContractPdf(c);
    if (!out) return;
    const harvest = harvests.find(h => h.id === c.harvestId);
    const p = producers.find(p => p.id === c.producerId);
    const file = new File([out.blob], out.filename, { type: 'application/pdf' });
    const title = `Fechamento — ${p?.nome ?? ''} (${harvest?.nome ?? ''})`;
    const resumo = buildResumoMensagem(c);

    // Web Share API com arquivo (mobile): abre seletor nativo com o PDF anexado.
    const nav: any = navigator;
    const canShareFiles = typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
    if (canShareFiles) {
      try {
        await nav.share({ files: [file], title, text: resumo });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.warn('[share] falhou, usando fallback', e);
      }
    }

    // Fallback (desktop / navegador sem suporte): baixa o PDF e abre o WhatsApp Web.
    const url = URL.createObjectURL(out.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = out.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.info('PDF baixado. No WhatsApp, clique no clipe 📎 e anexe o arquivo para enviar ao produtor.', { duration: 8000 });
    shareWhatsApp(resumo);
  }

  // Botão WhatsApp da listagem: mesmo comportamento — tenta anexar PDF, senão fallback.
  const whatsappContrato = shareContractPdf;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Contratos" subtitle="Valor por saco (60kg) — feche por contrato" />
      <div className="space-y-4 px-4 pb-6 md:px-6">
        <div className="space-y-2 rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select className={inputCls} value={producerId} onChange={e => setProducerId(Number(e.target.value))}>
            <option value="">Produtor…</option>
            {producers.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select className={inputCls} value={harvestId} onChange={e => setHarvestId(Number(e.target.value))}>
            <option value="">Safra…</option>
            {harvests.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
          </select>
          </div>
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="R$ por saco (60 kg) — ex: 3,50"
            value={valor}
            onChange={e => setValor(maskMoneyInput(e.target.value))}
          />
          <button onClick={add} className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary py-2.5 font-bold text-primary-foreground md:w-auto md:px-8">
            <Plus className="h-4 w-4" /> Adicionar contrato
          </button>
        </div>

        <div className="space-y-3">
          <ContractSection
            title="Contratos abertos"
            count={openContracts.length}
            expanded={openExpanded}
            onToggle={() => setOpenExpanded(v => !v)}
          >
            {openContracts.length === 0 ? (
              <EmptyContracts />
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {openContracts.map(c => renderCard(c))}
              </ul>
            )}
          </ContractSection>

          <ContractSection
            title="Contratos fechados"
            count={closedContracts.length}
            expanded={closedExpanded}
            onToggle={() => setClosedExpanded(v => !v)}
          >
            {closedContracts.length === 0 ? (
              <EmptyContracts />
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {closedContracts.map(c => renderCard(c))}
              </ul>
            )}
          </ContractSection>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir contrato?"
        description={
          toDelete && (
            <>
              Esta ação não pode ser desfeita. O contrato de{' '}
              <strong>{toDelete.produtor}</strong> na safra{' '}
              <strong>{toDelete.safra}</strong> será removido.
            </>
          )
        }
        onConfirm={confirmRemove}
      />

      <ConfirmDeleteDialog
        open={!!toClose}
        onOpenChange={(open) => !open && setToClose(null)}
        title="Fechar contrato?"
        description={
          toClose && (
            <>
              Ao fechar, novas viagens ficam bloqueadas para o contrato de{' '}
              <strong>{toClose.produtor}</strong> na safra{' '}
              <strong>{toClose.safra}</strong>. Você poderá reabrir depois.
            </>
          )
        }
        confirmLabel="Sim, fechar"
        onConfirm={confirmFechar}
      />

      <BlockedDeleteDialog
        open={!!blocked}
        onOpenChange={(open) => !open && setBlocked(null)}
        title={blocked?.title}
        description={blocked?.message}
      />

      <ConfirmDeleteDialog
        open={!!askSend}
        onOpenChange={(open) => !open && setAskSend(null)}
        title="Enviar relatório ao produtor?"
        description={
          askSend && (
            <>
              Deseja enviar agora o PDF de fechamento do contrato de{' '}
              <strong>{askSend.produtor}</strong> na safra{' '}
              <strong>{askSend.safra}</strong> pelo WhatsApp?
              <br />
              <span className="text-xs">No celular, será aberto o seletor de contatos com o PDF anexado.</span>
            </>
          )
        }
        confirmLabel="Sim, enviar"
        cancelLabel="Agora não"
        onConfirm={async () => {
          const target = askSend;
          setAskSend(null);
          if (target) await shareContractPdf(target.contract);
        }}
      />
    </div>
  );
}

function Mini({ label, v, cls }: { label: string; v: any; cls?: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 py-1.5">
      <p className={'font-display text-base leading-none ' + (cls ?? 'text-foreground')}>{v}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ContractSection({ title, count, expanded, onToggle, children }: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs font-medium">{count}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {expanded && <div className="border-t border-border p-3 md:p-4">{children}</div>}
    </div>
  );
}

function EmptyContracts() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
      <FileDown className="mx-auto h-8 w-8 text-muted-foreground/50" />
      <p className="mt-2 text-sm font-semibold text-foreground">Nenhum contrato aqui</p>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
