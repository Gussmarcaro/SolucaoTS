import type { AcaoAuditoria, CampoAlterado } from '@/types/auditoria';

/** Valor cru do log em algo legível na tela. */
function formatar(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  // Datas ISO viram dd/mm/aaaa; o resto passa direto.
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return d ? `${d[3]}/${d[2]}/${d[1]}` : s;
}

const ehDiff = (v: unknown): v is CampoAlterado =>
  typeof v === 'object' && v !== null && 'de' in v && 'para' in v;

interface Props {
  acao: AcaoAuditoria;
  alteracoes: Record<string, unknown> | null;
}

/**
 * Mostra o conteúdo do registro conforme a ação: em alteração, o antes e o
 * depois de cada campo; em exclusão, o retrato do que existia; em operação de
 * lote, a quantidade afetada.
 */
export function Alteracoes({ acao, alteracoes }: Props) {
  const campos = Object.entries(alteracoes ?? {});
  if (campos.length === 0) return <span className="text-xs text-ink-400">Sem detalhes.</span>;

  // Operação em lote: uma linha só, com a quantidade.
  if ('quantidade' in (alteracoes ?? {})) {
    const q = (alteracoes as { quantidade: number }).quantidade;
    return (
      <span className="text-xs text-ink-500 dark:text-ink-400">
        {q} registro(s) em uma única operação.
      </span>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
      {campos.map(([campo, valor]) => (
        <div key={campo} className="min-w-0 text-xs">
          <dt className="truncate font-medium text-ink-600 dark:text-ink-300">{campo}</dt>
          <dd className="truncate text-ink-500 dark:text-ink-400">
            {ehDiff(valor) ? (
              <>
                <span className="text-red-500 line-through">{formatar(valor.de)}</span>
                <span className="mx-1 text-ink-400">→</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatar(valor.para)}</span>
              </>
            ) : (
              // Exclusão: retrato do registro, sem "de/para".
              formatar(valor)
            )}
          </dd>
        </div>
      ))}
      {acao === 'EXCLUSAO' && (
        <p className="sm:col-span-2 mt-1 text-xs text-ink-400">
          Retrato do registro no momento da exclusão.
        </p>
      )}
    </dl>
  );
}
