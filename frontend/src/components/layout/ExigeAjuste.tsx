import { Link } from 'react-router-dom';
import { Building2, Loader2, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAjusteExecucao } from '@/contexts/AjusteExecucaoContext';
import { formatarMoeda, dataBr } from '@/lib/masks';

/** Sem acento e sem caixa — "Saúde" acha "saude", como nas demais buscas. */
const normalizar = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * A Execução só abre **dentro de um ajuste**.
 *
 * É um portão, não um filtro: sem a parceria escolhida não há tela. A escolha
 * não é enfeite de navegação — ela decide de quem é a despesa, a receita e o
 * pagamento que vão ser lançados, e essa pergunta não tem resposta padrão. Um
 * filtro em branco que mostra tudo convidaria a lançar sem dono, que é
 * exatamente o que se quer eliminar.
 *
 * A lista é a própria tela de entrada, com busca: quem opera reconhece a
 * parceria pelo número e pela entidade, então os dois aparecem.
 */
export function ExigeAjuste({ children }: { children: ReactNode }) {
  const { ajusteId, ajustes, carregando, escolher } = useAjusteExecucao();
  const [busca, setBusca] = useState('');

  if (carregando)
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
      </div>
    );

  if (ajusteId) return <>{children}</>;

  if (!ajustes.length)
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-ink-300 px-6 py-12 text-center dark:border-ink-700">
        <Building2 className="mx-auto h-8 w-8 text-ink-300 dark:text-ink-600" />
        <p className="mt-3 text-sm font-medium text-ink-700 dark:text-ink-200">
          Nenhum ajuste cadastrado.
        </p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          A execução acontece dentro de uma parceria. Cadastre o ajuste primeiro em{' '}
          <Link to="/cadastro/ajustes" className="font-semibold text-brand-600 underline dark:text-brand-400">
            Cadastro → Ajustes Celebrados
          </Link>
          .
        </p>
      </div>
    );

  const alvo = normalizar(busca);
  const filtrados = alvo
    ? ajustes.filter((a) =>
        normalizar(`${a.codigoAjuste} ${a.numero ?? ''} ${a.entidadeNome} ${a.objeto}`).includes(alvo),
      )
    : ajustes;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50">
          Qual parceria você vai executar?
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Receitas, despesas e pagamentos são lançados <strong>dentro</strong> de um ajuste — é o
          que impede a despesa de uma parceria entrar na prestação de outra. Dá para trocar a
          qualquer momento, no cabeçalho.
        </p>
      </div>

      {ajustes.length > 6 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código, entidade ou objeto..."
            className="focus-ring h-10 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
          />
        </div>
      )}

      <ul className="space-y-2">
        {filtrados.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => escolher(a.id)}
              className="focus-ring w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-medium text-ink-800 dark:text-ink-100">
                  {a.numero ? `${a.numero} — ` : ''}
                  {a.entidadeNome}
                </span>
                <span className="text-sm tabular-nums text-ink-600 dark:text-ink-300">
                  {formatarMoeda(a.valorGlobal)}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-xs text-ink-400">
                <span className="font-mono">{a.codigoAjuste}</span>
                <span>assinado em {dataBr(a.dataAssinatura)}</span>
              </div>
              <p className="mt-1 truncate text-xs text-ink-500 dark:text-ink-400" title={a.objeto}>
                {a.objeto}
              </p>
            </button>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="rounded-xl border border-dashed border-ink-300 py-8 text-center text-sm text-ink-400 dark:border-ink-700">
            Nenhum ajuste encontrado.
          </li>
        )}
      </ul>
    </div>
  );
}
