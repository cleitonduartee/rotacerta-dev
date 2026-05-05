import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Truck, FileSignature, Receipt, FileText, Plus, LogOut, WifiOff, HelpCircle } from 'lucide-react';
import { SyncIndicator } from './SyncIndicator';
import { OnboardingTour } from './OnboardingTour';
import { HelpCenter } from './HelpCenter';
import { useAuth } from '@/lib/auth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { TOUR_FLAG_PREFIX } from '@/lib/tourSteps';

const tabs = [
  { to: '/', icon: Home, label: 'Início', tourKey: 'tab-inicio' },
  { to: '/viagens', icon: Truck, label: 'Viagens', tourKey: 'tab-viagens' },
  { to: '/contratos', icon: FileSignature, label: 'Contratos', tourKey: 'tab-contratos' },
  { to: '/despesas', icon: Receipt, label: 'Despesas', tourKey: 'tab-despesas' },
  { to: '/cadastros', icon: FileText, label: 'Cadastros', tourKey: 'tab-cadastros' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const online = useOnlineStatus();
  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Auto-disparo do tour no primeiro acesso
  useEffect(() => {
    if (!user?.id) return;
    const flag = localStorage.getItem(TOUR_FLAG_PREFIX + user.id);
    if (!flag) {
      const t = window.setTimeout(() => setTourOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, [user?.id]);

  function handleCloseTour() {
    setTourOpen(false);
    if (user?.id) localStorage.setItem(TOUR_FLAG_PREFIX + user.id, '1');
  }

  function handleStartTour() {
    if (user?.id) localStorage.removeItem(TOUR_FLAG_PREFIX + user.id);
    setTourOpen(true);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Sidebar (desktop only) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30 md:border-r md:border-border/60 md:bg-card/40 md:backdrop-blur">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-border/60">
          <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-10 w-auto shrink-0" draggable={false} />
          <div className="leading-tight">
            <p className="font-display text-2xl leading-none text-primary">ROTASAFRA</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">CONTROLE DE FRETES AGRÍCOLAS</p>
          </div>
        </div>

        <div className="px-3 py-4">
          <button
            onClick={() => navigate('/viagens/nova')}
            data-tour="fab-nova-viagem"
            className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 font-bold text-primary-foreground shadow-elevated active:scale-95 transition-transform"
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
            Nova viagem
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {tabs.map((t) => (
              <li key={t.to} data-tour={t.tourKey}>
                <NavLink
                  to={t.to}
                  end={t.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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

        <div className="border-t border-border/60 px-3 py-3 text-center">
          <p className="text-[9px] tracking-normal text-muted-foreground/70">
            Desenvolvido por Cleiton Duarte © {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* Main container */}
      <div className="md:ml-64 md:flex-1 flex flex-col min-h-screen">
        <header className="safe-top sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-6">
          {/* Branding compacto: só aparece no mobile (no desktop já está na sidebar) */}
          <NavLink to="/" className="flex items-center gap-2 md:hidden" aria-label="RotaSafra — Início">
            <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-9 w-auto shrink-0" draggable={false} />
            <div className="leading-tight">
              <p className="font-display text-2xl leading-none text-primary">ROTASAFRA</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">CONTROLE DE FRETES AGRÍCOLAS</p>
            </div>
          </NavLink>

          {/* Espaço vazio para empurrar ações à direita no desktop */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-1">
            <SyncIndicator />
            <button
              onClick={() => setHelpOpen(true)}
              aria-label="Ajuda"
              data-tour="header-help"
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              onClick={handleSignOut}
              aria-label="Sair"
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {!online && (
          <div className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs font-semibold text-warning">
            <WifiOff className="h-3.5 w-3.5" />
            Modo offline — você pode continuar usando normalmente
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-32 md:pb-8">
          <div className="mx-auto w-full max-w-md md:max-w-5xl lg:max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* FAB nova viagem — apenas mobile */}
        <button
          onClick={() => navigate('/viagens/nova')}
          aria-label="Nova viagem"
          data-tour="fab-nova-viagem"
          className="md:hidden fixed bottom-24 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-elevated active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" strokeWidth={3} />
        </button>

        {/* Tab bar — apenas mobile */}
        <nav className="md:hidden safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border/60 bg-card/95 backdrop-blur">
          <ul className="grid grid-cols-5">
            {tabs.map((t) => (
              <li key={t.to} data-tour={t.tourKey}>
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
          <p className="pb-0.5 text-center text-[7px] font-normal tracking-normal text-muted-foreground/60">
            Desenvolvido por Cleiton Duarte © {new Date().getFullYear()}
          </p>
        </nav>
      </div>

      <OnboardingTour open={tourOpen} onClose={handleCloseTour} />
      <HelpCenter open={helpOpen} onOpenChange={setHelpOpen} onStartTour={handleStartTour} />
    </div>
  );
}
