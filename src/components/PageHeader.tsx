import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
      <div className="flex items-start gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="-ml-2 mt-0.5 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-3xl leading-none text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
