import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { NegativaAjustes } from './NegativaAjustes';
import { NegativaPrestacao } from './NegativaPrestacao';

type Aba = 'ajustes' | 'prestacao';

const ABAS: { chave: Aba; rotulo: string; dica: string }[] = [
  { chave: 'ajustes', rotulo: 'De Ajustes', dica: 'Por tipo de ajuste e período · feita na tela do Audesp' },
  { chave: 'prestacao', rotulo: 'Da Prestação de Contas', dica: 'Por ajuste e exercício · enviada como JSON' },
];

/**
 * Declaração Negativa da Fase V.
 *
 * São duas obrigações diferentes com o mesmo nome:
 *
 * - **de Ajustes**: por tipo de ajuste e período, feita na tela do Audesp;
 * - **da Prestação de Contas**: por ajuste e exercício, para o ajuste sem
 *   repasse no ano, enviada como JSON pela API.
 *
 * A aba fica na URL (`?aba=prestacao`) para o link do sino e o voltar do
 * navegador caírem no lugar certo.
 */
export function DeclaracaoNegativa() {
  const [params, setParams] = useSearchParams();
  const aba: Aba = params.get('aba') === 'prestacao' ? 'prestacao' : 'ajustes';

  return (
    <>
      <PageHeader
        title="Declaração Negativa"
        subtitle="O que o órgão declara ao TCESP quando não há ajuste assinado no período, ou repasse no exercício."
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setParams(a.chave === 'ajustes' ? {} : { aba: a.chave }, { replace: true })}
            className={cn(
              'focus-ring rounded-xl border px-4 py-2 text-left transition-colors',
              aba === a.chave
                ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/15'
                : 'border-ink-200 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-700',
            )}
          >
            <span
              className={cn(
                'block text-sm font-semibold',
                aba === a.chave ? 'text-brand-700 dark:text-brand-200' : 'text-ink-700 dark:text-ink-200',
              )}
            >
              {a.rotulo}
            </span>
            <span className="block text-xs text-ink-400">{a.dica}</span>
          </button>
        ))}
      </div>

      {aba === 'ajustes' ? <NegativaAjustes /> : <NegativaPrestacao />}
    </>
  );
}
