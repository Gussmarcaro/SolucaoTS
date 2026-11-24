import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { ATALHOS } from '@/lib/atalhos';
import {
  pendenciasDoOrgao,
  type ChavePendencia,
  type PendenciaDashboard,
} from '@/services/dashboard.service';

/**
 * Como cada pendência se anuncia, e para onde leva.
 *
 * Leva à **lista**, nunca a `?novo=1`: quem clica em "12 notas sem arquivo"
 * quer ver as notas, não lançar uma décima terceira.
 */
const PENDENCIA: Record<ChavePendencia, { texto: (n: number) => string; destino: string }> = {
  extratoSemConciliar: {
    texto: (n) => `${n} ${n === 1 ? 'linha' : 'linhas'} do extrato sem conciliar`,
    destino: '/execucao/financeiro/conciliacao',
  },
  notasSemArquivo: {
    texto: (n) => `${n} ${n === 1 ? 'nota' : 'notas'} sem arquivo anexado`,
    destino: '/execucao/financeiro/despesas',
  },
  pagamentosSemComprovante: {
    texto: (n) => `${n} ${n === 1 ? 'pagamento' : 'pagamentos'} sem comprovante`,
    destino: '/execucao/financeiro/pagamentos',
  },
  prestacoesEmElaboracao: {
    texto: (n) => `${n} ${n === 1 ? 'prestação' : 'prestações'} em elaboração`,
    destino: '/prestacao-contas',
  },
};

/**
 * Atalhos Rápidos — as ações do dia a dia a um clique, e o trabalho parado
 * logo abaixo.
 *
 * **Fica no topo do Dashboard** porque é a pergunta de quem acabou de entrar:
 * "o que vou fazer agora?". Os painéis de análise respondem outra, e podem
 * esperar a rolagem.
 *
 * Cada atalho só aparece com a permissão da tela a que leva, no nível que a
 * ação exige — lançar pede Edição. A linha de pendências não repete o sino:
 * o sino é o que **vence**; isto é o que **está parado** e não tem data, e por
 * isso acumula sem ninguém ver.
 */
export function FaixaAtalhos() {
  const { pode } = usePermissoes();
  const atalhos = ATALHOS.filter((a) => pode(a.recurso, a.nivel));
  const [pendencias, setPendencias] = useState<PendenciaDashboard[]>([]);

  useEffect(() => {
    let vivo = true;
    // Falha aqui não apaga os atalhos: eles valem por si, e a linha de
    // pendências simplesmente não aparece.
    pendenciasDoOrgao()
      .then((r) => vivo && setPendencias(r.filter((p) => p.total > 0)))
      .catch(() => vivo && setPendencias([]));
    return () => {
      vivo = false;
    };
  }, []);

  if (atalhos.length === 0 && pendencias.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-2 dark:border-ink-800">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Atalhos rápidos</h2>
        <span className="hidden text-[11px] text-ink-400 sm:inline">
          ou{' '}
          <kbd className="rounded border border-ink-200 px-1 font-sans dark:border-ink-700">Ctrl</kbd>
          {' + '}
          <kbd className="rounded border border-ink-200 px-1 font-sans dark:border-ink-700">K</kbd> de
          qualquer tela
        </span>
      </div>

      {atalhos.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
          {atalhos.map((a) => {
            const Icone = a.icone;
            return (
              <li key={a.id}>
                <Link
                  to={a.destino}
                  title={a.descricao}
                  className="focus-ring flex h-full flex-col items-center gap-1.5 px-3 py-3 text-center transition-colors hover:bg-brand-50/70 dark:hover:bg-brand-500/10"
                >
                  <Icone className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <span className="text-xs font-medium leading-tight text-ink-700 dark:text-ink-200">
                    {a.rotulo}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pendencias.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-4 py-2.5 dark:border-ink-800">
          <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Para resolver
          </span>
          {pendencias.map((p) => (
            <Link
              key={p.chave}
              to={PENDENCIA[p.chave].destino}
              className="focus-ring rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              {PENDENCIA[p.chave].texto(p.total)}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
