import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function RequireAuth() {
  const { session, loading, profile, profileLoaded } = useAuth();
  const loc = useLocation();

  if (loading || (session && !profileLoaded)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  // Sessão sem perfil completo (ex: travou no meio do cadastro) → volta pro login
  if (!profile?.cpf || !profile?.nome) {
    if (loc.pathname !== '/login') return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
