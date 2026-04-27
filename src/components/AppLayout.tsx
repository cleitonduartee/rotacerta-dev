import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Truck, Wheat, Receipt, FileText, Plus } from 'lucide-react';
import { SyncIndicator } from './SyncIndicator';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/viagens', icon: Truck, label: 'Viagens' },
  { to: '/safras', icon: Wheat, label: 'Safras' },
  { to: '/despesas', icon: Receipt, label: 'Despesas' },
  { to: '/cadastros', icon: FileText, label: 'Cadastros' },
];

export function AppLayout() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-display text-2xl leading-none text-primary">ROTACERTA</p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Estrada na palma da mão</p>
        </div>
        <SyncIndicator />
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <Outlet />
      </main>

      {/* FAB nova viagem */}
      <button
        onClick={() => navigate('/viagens/nova')}
        aria-label="Nova viagem"
        className="fixed bottom-24 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-elevated active:scale-95 transition-transform"
      >
        <Plus className="h-7 w-7" strokeWidth={3} />
      </button>

      <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border/60 bg-card/95 backdrop-blur">
        <ul className="grid grid-cols-5">
          {tabs.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                <t.icon className="h-5 w-5" />
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
