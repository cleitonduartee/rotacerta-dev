import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function RequireAuth() {
  const { session, loading, profile, profileLoaded } = useAuth();
  const loc = useLocation();
  const online = useOnlineStatus();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  // Se temos sessão mas o profile ainda está carregando E estamos online, espera.
  // Offline: não bloqueia (cache de sessão é suficiente).
  if (online && !profileLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Sessão sem perfil completo (ex: cadastro travou no meio) → manda pro login pra completar.
  // Só consideramos "incompleto" se o profile foi carregado online e veio sem cpf/nome.
  if (online && profileLoaded && (!profile?.cpf || !profile?.nome)) {
    if (loc.pathname !== '/login') return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
