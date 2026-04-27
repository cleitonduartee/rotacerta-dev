import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { fmtBRL, fmtNum } from '@/lib/format';
import { Lock, FileDown, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateHarvestReport, shareWhatsApp } from '@/lib/report';

export default function HarvestDetail() {
  const { id } = useParams();
  const harvestId = Number(id);
  const navigate = useNavigate();

  const harvest = useLiveQuery(() => db.harvests.get(harvestId), [harvestId]);
  const contracts = useLiveQuery(() => db.contracts.where('harvestId').equals(harvestId).toArray(), [harvestId]) ?? [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.where('harvestId').equals(harvestId).toArray(), [harvestId]) ?? [];
  const trucks = useLiveQuery(() => db.trucks.toArray(), []) ?? [];
  const producers = useLiveQuery(() => db.producers.toArray(), []) ?? [];
  const driver = useLiveQuery(() => db.drivers.toArray(), []) ?? [];

  if (!harvest) return null;

  const contractIds = new Set(contracts.map(c => c.id));
  const harvestTrips = trips.filter(t => t.kind === 'safra' && t.contractId && contractIds.has(t.contractId));
  const totalSacos = harvestTrips.reduce((s, t) => s + (t.sacos || 0), 0);
  const totalToneladas = totalSacos * 60 / 1000;
  const receita = harvestTrips.reduce((s, t) => s + t.valorTotal, 0);
  const despesas = expenses.reduce((s, e) => s + e.valor, 0);
  const liquido = receita - despesas;

  // resumo por caminhão
  const porCaminhao = trucks.map(tr => {
    const ts = harvestTrips.filter(t => t.truckId === tr.id);
    return { truck: tr, viagens: ts.length, sacos: ts.reduce((s, t) => s + (t.sacos || 0), 0), valor: ts.reduce((s, t) => s + t.valorTotal, 0) };
  }).filter(r => r.viagens > 0);

  async function fechar() {
    if (!confirm('Fechar a safra bloqueia novas edições. Confirma?')) return;
    await db.harvests.update(harvestId, { fechada: true, fechadaEm: Date.now(), syncStatus: 'pending', updatedAt: Date.now() });
    toast.success('Safra fechada');
  }

  async function pdf() {
    const blob = await generateHarvestReport({
      driver: driver[0], harvest, contracts, producers, trips: harvestTrips, expenses, trucks,
      totals: { totalSacos, totalToneladas, receita, despesas, liquido },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio-${harvest.nome.replace(/\s+/g, '-')}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  function whatsapp() {
    const msg =
      `*Fechamento ${harvest.nome}*\n` +
      `Tipo: ${harvest.tipo}\n` +
      `Viagens: ${harvestTrips.length}\n` +
      `Sacos (60kg): ${fmtNum(totalSacos, 2)}\n` +
      `Toneladas: ${fmtNum(totalToneladas, 2)}\n` +
      `Receita: ${fmtBRL(receita)}\n` +
      `Despesas: ${fmtBRL(despesas)}\n` +
      `*Líquido: ${fmtBRL(liquido)}*`;
    shareWhatsApp(msg);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title={harvest.nome} subtitle={`${harvest.tipo} • ${harvest.ano}`} />
      <div className="space-y-4 px-4 pb-6">
        {harvest.fechada && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            <Lock className="h-4 w-4" /> Safra fechada — não é possível editar viagens.
          </div>
        )}

        <div className="rounded-2xl gradient-primary p-5 shadow-elevated">
          <p className="text-xs uppercase tracking-widest text-primary-foreground/80">Sacos totais (60kg)</p>
          <p className="font-display text-5xl text-primary-foreground">{fmtNum(totalSacos, 2)}</p>
          <p className="text-sm text-primary-foreground/90 mt-1">{fmtNum(totalToneladas, 2)} toneladas</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Box label="Receita" v={fmtBRL(receita)} />
          <Box label="Despesas" v={fmtBRL(despesas)} />
          <Box label="Viagens" v={harvestTrips.length} />
          <Box label="Líquido" v={fmtBRL(liquido)} highlight />
        </div>

        <section>
          <h3 className="mb-2 font-display text-xl">Por caminhão</h3>
          {porCaminhao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem viagens.</p>
          ) : (
            <ul className="space-y-2">
              {porCaminhao.map(p => (
                <li key={p.truck.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{p.truck.placa}</p>
                    <p className="text-xs text-muted-foreground">{p.viagens} viagens • {fmtNum(p.sacos, 1)} sacos</p>
                  </div>
                  <p className="font-display text-xl text-primary">{fmtBRL(p.valor)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={pdf} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold">
            <FileDown className="h-4 w-4" /> Gerar PDF
          </button>
          <button onClick={whatsapp} className="flex items-center justify-center gap-2 rounded-xl bg-success py-3 font-bold text-success-foreground">
            <Share2 className="h-4 w-4" /> WhatsApp
          </button>
        </div>

        {!harvest.fechada && (
          <button onClick={fechar} className="flex w-full items-center justify-center gap-2 rounded-xl border border-warning/40 bg-warning/10 py-4 font-bold text-warning">
            <Lock className="h-5 w-5" /> Fechar safra
          </button>
        )}
      </div>
    </div>
  );
}

function Box({ label, v, highlight }: { label: string; v: any; highlight?: boolean }) {
  return (
    <div className={'rounded-xl border p-3 ' + (highlight ? 'border-primary/40 bg-primary/10' : 'border-border bg-card')}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={'font-display mt-1 leading-none ' + (highlight ? 'text-2xl text-primary' : 'text-xl')}>{v}</p>
    </div>
  );
}
