import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  /** Valor em ISO yyyy-MM-dd */
  value: string;
  /** Retorna ISO yyyy-MM-dd */
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * DatePicker moderno — abre o calendário ao clicar em qualquer parte do campo.
 * Armazena e expõe valores em ISO (yyyy-MM-dd) para continuar compatível com o
 * resto do app, mas exibe para o usuário no formato dd/MM/yyyy (pt-BR).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  className,
  disabled,
}: DatePickerProps) {
  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between rounded-lg border border-border bg-input px-3 py-3 text-left text-base transition-colors hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {selected ? format(selected, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
          </span>
          <CalendarIcon className="ml-2 h-5 w-5 shrink-0 text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
