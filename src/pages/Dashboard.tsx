import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { fmtBRL, fmtNum } from '@/lib/format';
import { Truck, Wheat, Package, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const trips = useLiveQuery(() => db.trips.toArray(), [], []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), [], []);
  const harvests = useLiveQuery(() => db.harvests.toArray(), [], []);

  const totalReceita = trips.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const totalDespesas = expenses.reduce((s, e) => s + e.valor, 0);
  const totalSacos = trips.filter(t => t.kind === 'safra').reduce((s, t) => s + (t.sacos || 0), 0);
  const liquido = totalReceita - totalDespesas;
  const safrasAbertas = harvests.filter(h => !h.fechada).length;

  const last5 = [...trips].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <div className="space-y-5 px-4 pt-3 pb-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-5 shadow-elevated">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">Líquido total</p>
        <p className="font-display text-5xl leading-none text-primary-foreground mt-1">{fmtBRL(liquido)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-primary-foreground">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Receita</p>
            <p className="font-display text-xl">{fmtBRL(totalReceita)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Despesas</p>
            <p className="font-display text-xl">{fmtBRL(totalDespesas)}</p>
          </div>
        </div>
        <Truck className="absolute -right-4 -bottom-3 h-28 w-28 text-primary-foreground/10" strokeWidth={1.5} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Truck} value={trips.length} label="Viagens" />
        <Stat icon={Package} value={fmtNum(totalSacos, 0)} label="Sacos" />
        <Stat icon={Wheat} value={safrasAbertas} label="Safras abertas" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/viagens/nova" label="Nova viagem" icon={Truck} primary />
        <QuickLink to="/despesas/nova" label="Nova despesa" icon={Receipt} />
      </div>

      {/* Últimas viagens */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl">Últimas viagens</h2>
          <Link to="/viagens" className="text-xs font-semibold uppercase tracking-wide text-primary">Ver todas</Link>
        </div>
        {last5.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Nenhuma viagem registrada ainda. Toque no <span className="font-bold text-primary">+</span> para começar.
          </div>
        ) : (
          <ul className="space-y-2">
            {last5.map(t => (
              <li key={t.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t.kind === 'safra' ? 'Safra' : 'Frete avulso'} • {t.data}
                    </p>
                    <p className="font-semibold">{t.origem} → {t.destino}</p>
                  </div>
                  <p className="font-display text-2xl text-primary">{fmtBRL(t.valorTotal)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <Icon className="h-4 w-4 text-primary" />
      <p className="font-display text-2xl mt-1 leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function QuickLink({ to, label, icon: Icon, primary }: { to: string; label: string; icon: any; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={
        'flex items-center gap-3 rounded-xl border p-4 transition-all active:scale-95 ' +
        (primary
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-card text-foreground')
      }
    >
      <Icon className="h-5 w-5" />
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}
