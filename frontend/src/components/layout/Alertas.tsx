import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileWarning,
  Loader2,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { http } from '@/services/http';
import {
  URGENCIA_LABEL,
  URGENCIA_TONE,
  rotaDoAlerta,
  rotuloDias,
  type Alerta,
  type TipoAlerta,
  type UrgenciaAlerta,
} from '@/types/alerta';

const ICONES: Record<TipoAlerta, LucideIcon> = {
  PRESTACAO_REJEITADA: ShieldAlert,
  CERTIDAO: FileWarning,
  CADASTRO_AJUSTE: CalendarClock,
  CADASTRO_ADITIVO: CalendarClock,
  DECLARACAO_NEGATIVA: Building2,
  PRESTACAO_CONTAS: ClipboardCheck,
};

const ORDEM: UrgenciaAlerta[] = ['VENCIDO', 'CRITICO', 'PROXIMO'];

/**
 * Painel do sino — prazos legais e pendências.
 *
 * Os alertas são calculados no servidor a cada consulta, não gravados: uma
 * notificação armazenada envelhece (a certidão foi renovada e o aviso continua
 * lá), e aqui isso significaria alguém confiando num prazo que já não existe.
 */
export function Alertas({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    // Recarrega a cada abertura: entre uma e outra o usuário pode ter
    // renovado a certidão ou corrigido a prestação.
    setAlertas(null);
    setErro(false);
    http
      .get<Alerta[]>('/alertas')
      .then((r) => setAlertas(r.data))
      .catch(() => setErro(true));
  }, [aberto]);

  const grupos = useMemo(() => {
    if (!alertas) return [];
    return ORDEM.map((u) => [u, alertas.filter((a) => a.urgencia === u)] as const).filter(
      ([, itens]) => itens.length > 0,
    );
  }, [alertas]);

  if (!aberto) return null;

  function abrir(a: Alerta) {
    navigate(rotaDoAlerta(a));
    onFechar();
  }

  // Fechar clicando fora é responsabilidade da Topbar: um `fixed inset-0` aqui
  // dentro não cobriria a página. O cabeçalho tem `backdrop-blur`, e filtro
  // (como transform) faz o elemento virar bloco de contenção dos filhos
  // `fixed` — a camada ficaria presa à faixa do topo, deixando passar
  // justamente os cliques no miolo da tela.
  return (
    <>
      <div
        role="dialog"
        aria-label="Prazos e pendências"
        className="absolute right-0 top-12 z-40 max-h-[70vh] w-[22rem] overflow-y-auto rounded-2xl border border-ink-200 bg-white py-2 shadow-pop dark:border-ink-800 dark:bg-ink-900 sm:w-[24rem]"
      >
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Prazos e pendências</p>
        {alertas && alertas.length > 0 && <Badge tone="danger">{alertas.length}</Badge>}
      </div>

      {alertas === null && !erro && (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando prazos…
        </p>
      )}

      {erro && <p className="px-4 py-6 text-sm text-red-500">Não foi possível verificar os prazos.</p>}

      {alertas?.length === 0 && (
        <p className="px-4 py-6 text-sm text-ink-500 dark:text-ink-400">
          Nenhum prazo próximo e nenhuma pendência. Os prazos aparecem aqui a partir de 30 dias do
          vencimento.
        </p>
      )}

      {grupos.map(([urgencia, itens]) => (
        <div key={urgencia}>
          <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            {URGENCIA_LABEL[urgencia]}
          </p>
          {itens.map((a) => {
            const Icone = ICONES[a.tipo];
            const prazo = rotuloDias(a.dias);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => abrir(a)}
                className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60"
              >
                <Icone
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    urgencia === 'VENCIDO'
                      ? 'text-red-500'
                      : urgencia === 'CRITICO'
                        ? 'text-amber-500'
                        : 'text-ink-400',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-ink-800 dark:text-ink-100">
                      {a.titulo}
                    </span>
                    {prazo && (
                      <span className="shrink-0">
                        <Badge tone={URGENCIA_TONE[urgencia]}>{prazo}</Badge>
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">
                    {a.detalhe}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {!!alertas?.length && (
        <p className="mt-2 border-t border-ink-100 px-4 pt-2 text-[11px] text-ink-400 dark:border-ink-800">
          Prazos em dias úteis são calculados sem o calendário de feriados — o prazo real pode ser
          um pouco maior, nunca menor.
        </p>
        )}
      </div>
    </>
  );
}
