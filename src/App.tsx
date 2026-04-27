import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./lib/auth";
import { RequireAuth } from "./components/RequireAuth";
import { UserDataGate } from "./components/UserDataGate";
import Dashboard from "./pages/Dashboard";
import TripsList from "./pages/TripsList";
import TripForm from "./pages/TripForm";
import HarvestsList from "./pages/HarvestsList";
import HarvestDetail from "./pages/HarvestDetail";
import ContractsPage from "./pages/ContractsPage";
import { ExpensesList, ExpenseForm } from "./pages/Expenses";
import CadastrosPage from "./pages/CadastrosPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<UserDataGate />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/viagens" element={<TripsList />} />
                  <Route path="/viagens/nova" element={<TripForm />} />
                  <Route path="/viagens/:id" element={<TripForm />} />
                  <Route path="/contratos" element={<ContractsPage />} />
                  <Route path="/safras" element={<HarvestsList />} />
                  <Route path="/safras/contratos" element={<ContractsPage />} />
                  <Route path="/safras/:id" element={<HarvestDetail />} />
                  <Route path="/despesas" element={<ExpensesList />} />
                  <Route path="/despesas/nova" element={<ExpenseForm />} />
                  <Route path="/despesas/:id" element={<ExpenseForm />} />
                  <Route path="/cadastros" element={<CadastrosPage />} />
                  <Route path="/relatorios" element={<ReportsPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

