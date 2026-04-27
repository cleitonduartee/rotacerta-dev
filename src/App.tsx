import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import TripsList from "./pages/TripsList";
import TripForm from "./pages/TripForm";
import HarvestsList from "./pages/HarvestsList";
import HarvestDetail from "./pages/HarvestDetail";
import ContractsPage from "./pages/ContractsPage";
import { ExpensesList, ExpenseForm } from "./pages/Expenses";
import CadastrosPage from "./pages/CadastrosPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" richColors />
      <BrowserRouter>
        <Routes>
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
