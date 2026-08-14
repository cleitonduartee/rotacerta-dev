import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, stamp, deleteWithTombstone } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtNum, fmtDate, fmtHarvestName, fmtHarvestTipo, slugFileName } from '@/lib/format';
import { Plus, Trash2, Lock, Unlock, FileDown, Share2, ChevronDown, ChevronUp, CheckCircle2, CircleDollarSign, Pencil, HandCoins } from 'lucide-react';
import { AdvanceDialog } from '@/components/AdvanceDialog';
import { toast } from 'sonner';
import { generateHarvestReport, shareWhatsApp } from '@/lib/report';
import { maskMoneyInput, parseMoney } from '@/lib/masks';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { BlockedDeleteDialog } from '@/components/BlockedDeleteDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


export default function ContractsPage() {
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];
  const advances = useLiveQuery(() => db.advances.toArray(), []) ?? [];
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
  const [toEdit, setToEdit] = useState<{ id: number; produtor: string; safra: string; valor: string } | null>(null);
  const [askRecalc, setAskRecalc] = useState<{ id: number; novoValor: number; nViagens: number } | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<{ contractId: number; label: string } | null>(null);




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

  function askEdit(c: any) {
    const p = producers.find(pp => pp.id === c.producerId);
    const h = harvests.find(hh => hh.id === c.harvestId);
    setToEdit({
      id: c.id,
      produtor: p?.nome ?? '?',
      safra: h?.nome ?? '?',
      valor: maskMoneyInput(String(Math.round((c.valorPorSaco || 0) * 100))),
    });
  }

  async function saveEdit() {
    if (!toEdit) return;
    const v = parseMoney(toEdit.valor);
    if (!v) return toast.error('Valor inválido');
    await db.contracts.update(toEdit.id, { valorPorSaco: v, ...stamp() });
    const ts = trips.filter(t => t.kind === 'safra' && t.contractId === toEdit.id);
    toast.success('Contrato atualizado');
    const id = toEdit.id;
    setToEdit(null);
    if (ts.length > 0) setAskRecalc({ id, novoValor: v, nViagens: ts.length });
  }

  async function confirmRecalc() {
    if (!askRecalc) return;
    const { id, novoValor } = askRecalc;
    const ts = trips.filter(t => t.kind === 'safra' && t.contractId === id);
    for (const t of ts) {
      const sacos = t.sacos ?? 0;
      await db.trips.update(t.id!, {
        valorPorSacoOverride: undefined,
        valorTotal: sacos * novoValor,
        ...stamp(),
      });
    }
    setAskRecalc(null);
    toast.success(`${ts.length} ${ts.length === 1 ? 'viagem atualizada' : 'viagens atualizadas'}`);
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
    await db.contracts.update(id, { fechado: false, fechadoEm: undefined, recebido: false, recebidoEm: undefined, ...stamp() });
    toast.success('Contrato reaberto');
  }

  async function toggleRecebido(c: any) {
    const novo = !c.recebido;
    await db.contracts.update(c.id!, {
      recebido: novo,
      recebidoEm: novo ? Date.now() : undefined,
      ...stamp(),
    });
    toast.success(novo ? 'Contrato marcado como recebido' : 'Recebimento desmarcado');
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
    const tipo = fmtHarvestTipo(harvest.tipo);
    const safraFile = harvest.ano ? `${tipo}-${harvest.ano}` : tipo;
    const filename = `Fechamento-${slugFileName(p?.nome ?? 'produtor')}-${slugFileName(safraFile)}.pdf`;
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

    const showCultura = harvest?.tipo === 'milho_sorgo';
    const tripsOrd = [...r.trips].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    const linhasViagens = tripsOrd.map((t, i) => {
      const sacos = t.sacos ?? 0;
      const nota = t.numeroNota ? ` • Nota ${t.numeroNota}` : '';
      const peso = t.pesoKg ? ` • ${fmtNum(t.pesoKg / 1000, 2)}t` : '';
      const cult = showCultura ? ` • ${t.cultura === 'sorgo' ? 'Sorgo' : 'Milho'}` : '';
      return `${i + 1}. ${fmtDate(t.data)}${cult}${peso} • ${fmtNum(sacos, 2)} sc • ${fmtBRL(t.valorTotal)}${nota}`;
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
      `Safra: ${fmtHarvestName(harvest)}\n` +
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

  function renderCard(c: any) {
    const p = producers.find(p => p.id === c.producerId);
    const h = harvests.find(h => h.id === c.harvestId);
    const r = calcContrato(c.id!);
    const tripIds = new Set(r.trips.map(t => t.id));
    const despesas = expenses
      .filter(e => e.contractId === c.id || (e.tripId && tripIds.has(e.tripId)))
      .reduce((s, e) => s + (e.valor || 0), 0);
    const adiantado = advances
      .filter(a => a.contractId === c.id)
      .reduce((s, a) => s + (a.valor || 0), 0);
    const liquido = r.receita - despesas - adiantado;
    return (
      <li key={c.id} className={'rounded-xl border bg-card p-3 ' + (c.fechado ? 'border-muted opacity-90' : 'border-border')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{p?.nome ?? '?'}</p>
            <p className="text-xs text-muted-foreground">{h?.nome ?? '?'} • {h?.tipo}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ' +
              (c.fechado ? 'bg-muted text-muted-foreground' : 'bg-success/20 text-success')}>
              {c.fechado ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {c.fechado ? 'Fechado' : 'Aberto'}
            </span>
            {c.fechado && (
              <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                (c.recebido ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning')}>
                {c.recebido ? 'Recebido' : 'A receber'}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Mini label="Viagens" v={r.viagens} />
          <Mini label="Sacos" v={fmtNum(r.sacos, 1)} />
          <Mini label="Despesas" v={fmtBRL(despesas)} cls="text-destructive" />
        </div>

        <div className="mt-2 rounded-lg border border-border bg-secondary/40 p-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Bruto</span>
            <span className="font-display text-sm">{fmtBRL(r.receita)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Despesas</span>
            <span className="font-display text-sm text-destructive">−{fmtBRL(despesas)}</span>
          </div>
          {adiantado > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Adiantamentos</span>
              <span className="font-display text-sm text-warning">−{fmtBRL(adiantado)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {adiantado > 0 ? 'Saldo a pagar' : 'Líquido'}
            </span>
            <span className="font-display text-base text-primary">{fmtBRL(liquido)}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>R$ {fmtNum(c.valorPorSaco)} / saco</span>
          <button onClick={() => askEdit(c)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
            <Pencil className="h-3.5 w-3.5" /> Editar valor
          </button>
        </div>

        <button
          onClick={() => setAdvanceTarget({ contractId: c.id!, label: `${p?.nome ?? 'Produtor'} • ${h?.nome ?? 'Safra'}` })}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 py-2 text-xs font-bold text-primary"
        >
          <HandCoins className="h-3.5 w-3.5" />
          {adiantado > 0 ? `Adiantamentos • ${fmtBRL(adiantado)}` : 'Lançar adiantamento'}
        </button>






        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => pdfContrato(c)} className="flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-2 text-xs font-semibold">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </button>
          <button onClick={() => whatsappContrato(c)} className="flex items-center justify-center gap-1 rounded-lg bg-success py-2 text-xs font-bold text-success-foreground">
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </button>
        </div>

        {c.fechado ? (
          <div className="mt-2 space-y-2">
            <button
              onClick={() => toggleRecebido(c)}
              className={
                'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ' +
                (c.recebido
                  ? 'bg-success text-success-foreground'
                  : 'border border-success/40 bg-success/10 text-success')
              }
            >
              {c.recebido ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDollarSign className="h-3.5 w-3.5" />}
              {c.recebido ? 'Recebido' : 'Marcar como recebido'}
            </button>
            <button onClick={() => reabrir(c.id!)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-semibold">
              <Unlock className="h-3.5 w-3.5" /> Reabrir contrato
            </button>
          </div>
        ) : (
          <button onClick={() => askFechar(c)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-warning/40 bg-warning/10 py-2 text-xs font-bold text-warning">
            <Lock className="h-3.5 w-3.5" /> Fechar contrato
          </button>
        )}

        <div className="mt-3 border-t border-border pt-2">
          <button
            onClick={() => askRemove(c)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir contrato
          </button>
        </div>
      </li>

    );
  }

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

      <Dialog open={!!toEdit} onOpenChange={(open) => !open && setToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar contrato</DialogTitle>
          </DialogHeader>
          {toEdit && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{toEdit.produtor}</strong> — {toEdit.safra}
              </p>
              <input
                className={inputCls}
                inputMode="decimal"
                placeholder="R$ por saco (60 kg) — ex: 3,50"
                value={toEdit.valor}
                onChange={e => setToEdit({ ...toEdit, valor: maskMoneyInput(e.target.value) })}
              />
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setToEdit(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">
              Cancelar
            </button>
            <button onClick={saveEdit} className="rounded-lg gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!askRecalc}
        onOpenChange={(open) => !open && setAskRecalc(null)}
        title="Atualizar viagens já lançadas?"
        description={
          askRecalc && (
            <>
              Este contrato possui{' '}
              <strong>{askRecalc.nViagens} {askRecalc.nViagens === 1 ? 'viagem lançada' : 'viagens lançadas'}</strong>.
              Deseja recalcular {askRecalc.nViagens === 1 ? 'ela' : 'elas'} com o novo valor de{' '}
              <strong>{fmtBRL(askRecalc.novoValor)} / saco</strong>? Valores manuais informados nas viagens serão substituídos.
            </>
          )
        }
        confirmLabel="Sim, atualizar"
        cancelLabel="Não, manter"
        onConfirm={confirmRecalc}
      />


      <BlockedDeleteDialog
        open={!!blocked}
        onOpenChange={(open) => !open && setBlocked(null)}
        title={blocked?.title}
        description={blocked?.message}
      />

      <AdvanceDialog
        open={!!advanceTarget}
        onOpenChange={(o) => !o && setAdvanceTarget(null)}
        contractId={advanceTarget?.contractId}
        targetLabel={advanceTarget?.label}
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
