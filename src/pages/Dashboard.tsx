import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { fmtBRL, fmtNum } from '@/lib/format';
import { Truck, Wheat, Package, Receipt, FileBarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';

type PeriodMode = 'mes' | 'ano' | 'tudo';

// Paleta a partir do laranja primário (HSL → variações de matiz)
const PIE_COLORS = [
  'hsl(22 95% 55%)',   // primary
  'hsl(30 100% 65%)',  // primary-glow
  'hsl(42 100% 55%)',  // warning
  'hsl(200 95% 45%)',  // accent
  'hsl(142 70% 45%)',  // success
  'hsl(350 80% 60%)',
  'hsl(265 70% 60%)',
  'hsl(15 70% 45%)',
];

const MES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function Dashboard() {
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];
  const harvests = useLiveQuery(() => db.harvests.toArray(), []) ?? [];
  const contracts = useLiveQuery(() => db.contracts.toArray(), []) ?? [];

  const hoje = new Date();
  const [mode, setMode] = useState<PeriodMode>('tudo');
  const [mes, setMes] = useState<string>(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
  const [ano, setAno] = useState<number>(hoje.getFullYear());

  // Anos disponíveis a partir dos dados
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    trips.forEach(t => t.data && anos.add(Number(t.data.slice(0, 4))));
    expenses.forEach(e => e.data && anos.add(Number(e.data.slice(0, 4))));
    anos.add(hoje.getFullYear());
    return Array.from(anos).filter(Boolean).sort((a, b) => b - a);
  }, [trips, expenses]);

  // Filtragem por período
  const { tripsF, expensesF, periodoLabel } = useMemo(() => {
    if (mode === 'mes') {
      return {
        tripsF: trips.filter(t => t.data?.startsWith(mes)),
        expensesF: expenses.filter(e => e.data?.startsWith(mes)),
        periodoLabel: `${mes.slice(5)}/${mes.slice(0, 4)}`,
      };
    }
    if (mode === 'ano') {
      const p = String(ano);
      return {
        tripsF: trips.filter(t => t.data?.startsWith(p)),
        expensesF: expenses.filter(e => e.data?.startsWith(p)),
        periodoLabel: p,
      };
    }
    return { tripsF: trips, expensesF: expenses, periodoLabel: 'Tudo' };
  }, [mode, mes, ano, trips, expenses]);

  const totalReceita = tripsF.reduce((s, t) => s + (t.valorTotal || 0), 0);
  const totalDespesas = expensesF.reduce((s, e) => s + e.valor, 0);
  const liquido = totalReceita - totalDespesas;
  const totalSacos = tripsF.filter(t => t.kind === 'safra').reduce((s, t) => s + (t.sacos || 0), 0);
  const safrasAbertas = harvests.filter(h => !h.fechada).length;

  // Gráfico 1 — Receita vs Despesa últimos 6 meses
  const barsData = useMemo(() => {
    const base: { mes: string; key: string; receita: number; despesa: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      base.push({ mes: `${MES_LABEL[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, key, receita: 0, despesa: 0 });
    }
    trips.forEach(t => {
      const k = t.data?.slice(0, 7);
      const row = base.find(b => b.key === k);
      if (row) row.receita += t.valorTotal || 0;
    });
    expenses.forEach(e => {
      const k = e.data?.slice(0, 7);
      const row = base.find(b => b.key === k);
      if (row) row.despesa += e.valor || 0;
    });
    return base;
  }, [trips, expenses]);

  // Gráfico 2 — Receita por Safra (pizza)
  const pizzaSafra = useMemo(() => {
    const map = new Map<string, number>();
    let fretes = 0;
    tripsF.forEach(t => {
      if (t.kind === 'safra' && t.contractId) {
        const c = contracts.find(cc => cc.id === t.contractId);
        const h = c ? harvests.find(hh => hh.id === c.harvestId) : null;
        const nome = h?.nome ?? 'Safra ?';
        map.set(nome, (map.get(nome) || 0) + (t.valorTotal || 0));
      } else {
        fretes += t.valorTotal || 0;
      }
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    if (fretes > 0) arr.push({ name: 'Fretes avulsos', value: fretes });
    return arr.sort((a, b) => b.value - a.value);
  }, [tripsF, contracts, harvests]);

  // Gráfico 3 — Receita mensal do ano (linha)
  const linhaAno = useMemo(() => {
    const anoRef = mode === 'mes' ? Number(mes.slice(0, 4)) : mode === 'ano' ? ano : hoje.getFullYear();
    const arr = MES_LABEL.map((m, i) => ({ mes: m, valor: 0, key: `${anoRef}-${String(i + 1).padStart(2, '0')}` }));
    trips.forEach(t => {
      if (t.data?.startsWith(String(anoRef))) {
        const idx = Number(t.data.slice(5, 7)) - 1;
        if (arr[idx]) arr[idx].valor += t.valorTotal || 0;
      }
    });
    return { data: arr, anoRef };
  }, [trips, mode, mes, ano]);

  // Gráfico 4 — Despesas por tipo (pizza)
  const pizzaDespesas = useMemo(() => {
    const map = new Map<string, number>();
    expensesF.forEach(e => {
      const k = e.tipo || 'Outros';
      map.set(k, (map.get(k) || 0) + (e.valor || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expensesF]);

  const last5 = [...trips].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <div className="space-y-5 px-4 pt-3 pb-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-5 shadow-elevated">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">Líquido • {periodoLabel}</p>
        </div>
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

      {/* Filtro de período */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-card">
        <div className="flex gap-1.5 mb-2">
          {(['mes', 'ano', 'tudo'] as PeriodMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                'flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ' +
                (mode === m ? 'bg-primary text-primary-foreground shadow-elevated' : 'bg-secondary text-muted-foreground')
              }
            >
              {m === 'mes' ? 'Mês' : m === 'ano' ? 'Ano' : 'Tudo'}
            </button>
          ))}
        </div>
        {mode === 'mes' && (
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          />
        )}
        {mode === 'ano' && (
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          >
            {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Truck} value={tripsF.length} label="Viagens" />
        <Stat icon={Package} value={fmtNum(totalSacos, 0)} label="Sacos" />
        <Stat icon={Wheat} value={safrasAbertas} label="Safras abertas" />
      </div>

      {/* Empty state consolidado */}
      {!barsData.some(b => b.receita || b.despesa) && pizzaSafra.length === 0 && !linhaAno.data.some(d => d.valor > 0) && pizzaDespesas.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-5 text-center text-sm text-muted-foreground">
          Sem dados no período selecionado. Registre uma viagem ou despesa para ver os gráficos.
        </div>
      )}

      {/* Gráfico — Receita vs Despesa */}
      {barsData.some(b => b.receita || b.despesa) && (
      <ChartCard title="Receita × Despesa" subtitle="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barsData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(v: number) => fmtBRL(v)}
                cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receita" name="Receita" fill="hsl(22 95% 55%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="hsl(0 84% 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
      </ChartCard>
      )}

      {/* Gráfico — Receita por Safra */}
      {pizzaSafra.length > 0 && (
      <ChartCard title="Receita por Safra" subtitle={periodoLabel}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pizzaSafra}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
              >
                {pizzaSafra.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
      </ChartCard>
      )}

      {/* Gráfico — Linha receita mensal do ano */}
      {linhaAno.data.some(d => d.valor > 0) && (
      <ChartCard title="Receita mensal" subtitle={String(linhaAno.anoRef)}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={linhaAno.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Line type="monotone" dataKey="valor" name="Receita" stroke="hsl(22 95% 55%)" strokeWidth={3} dot={{ fill: 'hsl(22 95% 55%)', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
      </ChartCard>
      )}

      {/* Gráfico — Despesas por tipo */}
      {pizzaDespesas.length > 0 && (
      <ChartCard title="Despesas por tipo" subtitle={periodoLabel}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pizzaDespesas}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
              >
                {pizzaDespesas.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
      </ChartCard>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink to="/viagens/nova" label="Nova viagem" icon={Truck} primary />
        <QuickLink to="/despesas/nova" label="Nova despesa" icon={Receipt} />
        <QuickLink to="/relatorios" label="Relatórios" icon={FileBarChart} />
        <QuickLink to="/contratos" label="Contratos" icon={Wheat} />
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

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-display text-lg leading-none">{title}</h3>
        {subtitle && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
      Sem dados no período
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
