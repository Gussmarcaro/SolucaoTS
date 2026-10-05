import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Building2, FileText, Truck, UserCog, UserRound } from 'lucide-react';
import {
  contagensDosCadastros,
  type ChaveCadastro,
  type ContagemCadastro,
} from '@/services/dashboard.service';

/**
 * Os cadastros, no rodapé.
 *
 * **Eram seis cartões grandes no topo da tela** — o lugar mais nobre do
 * Dashboard — e o próprio CLAUDE.md já dizia, duas vezes, que "quantos
 * fornecedores tenho" é a informação menos acionável que existe ali. Ela não
 * some: continua a um clique, só deixa de disputar o lugar com o que decide o
 * dia.
 *
 * A diferença não é só de posição. Os cartões custavam **doze requisições** (um
 * total e um "ativos" por cadastro), mais da metade de tudo que a tela pedia ao
 * abrir. Aqui é **uma**.
 *
 * Também passou a respeitar permissão: a grade antiga não consultava nenhuma, e
 * quem não tem acesso a Colaboradores ficava sabendo quantos existem. Quem
 * recorta é o servidor — cadastro sem permissão não volta na resposta.
 */

const META: Record<ChaveCadastro, { rotulo: string; rota: string; icone: typeof Building2 }> = {
  entidades: { rotulo: 'Entidades', rota: '/cadastro/entidades', icone: Building2 },
  fornecedores: { rotulo: 'Fornecedores', rota: '/cadastro/fornecedores', icone: Truck },
  colaboradores: { rotulo: 'Colaboradores', rota: '/cadastro/colaboradores', icone: UserRound },
  contratos: { rotulo: 'Contratos', rota: '/cadastro/contratos', icone: FileText },
  bens: { rotulo: 'Bens cedidos', rota: '/cadastro/bens-cedidos', icone: Boxes },
  servidores: { rotulo: 'Servidores cedidos', rota: '/cadastro/servidores-cedidos', icone: UserCog },
};

const n = (v: number) => v.toLocaleString('pt-BR');

export function FaixaCadastros() {
  const [itens, setItens] = useState<ContagemCadastro[] | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    contagensDosCadastros()
      .then((r) => vivo && setItens(r))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  // Mesma regra dos demais painéis: falhou ou não há nada a mostrar, some —
  // inclusive quando o grupo não pode ler cadastro nenhum.
  if (falhou || !itens || itens.length === 0) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="border-b border-ink-100 px-4 py-2 dark:border-ink-800">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Cadastros</h2>
      </div>

      <ul className="flex flex-wrap divide-ink-100 dark:divide-ink-800">
        {itens.map((c) => {
          const meta = META[c.chave];
          if (!meta) return null;
          const Icone = meta.icone;
          // Inativo só aparece quando existe. Escrever "0 inativos" em cinco de
          // seis linhas vira ruído que ensina a não ler a faixa.
          const inativos = c.ativos === null ? 0 : c.total - c.ativos;

          return (
            <li key={c.chave} className="min-w-[8.5rem] flex-1">
              <Link
                to={meta.rota}
                className="focus-ring flex h-full items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
              >
                <Icone className="h-4 w-4 shrink-0 text-ink-400" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tabular-nums text-ink-800 dark:text-ink-100">
                    {n(c.ativos ?? c.total)}
                    {inativos > 0 && (
                      <span className="ml-1.5 text-[11px] font-normal text-ink-400">
                        +{n(inativos)} inativo{inativos > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-ink-500 dark:text-ink-400">
                    {meta.rotulo}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
