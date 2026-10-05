import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';
import { relatorioExecucao } from '@/services/relatorios.service';
import { formatarMoeda } from '@/lib/masks';
import type { LinhaExecucao } from '@/pages/Relatorios/tipos';
import { BarraEmpilhada, type LinhaEmpilhada } from '@/components/graficos/BarraEmpilhada';
import { Legenda } from '@/components/graficos/base';

interface Totais {
  valorGlobal: number;
  repassado: number;
  pago: number;
  emPoderDaEntidade: number;
  ajustes: number;
}

/** Quantas parcerias o gráfico desenha. Além disso vira lista, não leitura. */
const NO_GRAFICO = 6;

const SERIES = [
  { rotulo: 'Pago pela OSC', cor: 'var(--g-exec-pago)' },
  { rotulo: 'Em poder da OSC', cor: 'var(--g-exec-osc)' },
  { rotulo: 'A repassar', cor: 'var(--g-exec-repassar)' },
];

/**
 * Faixa de execução financeira, no topo do Dashboard.
 *
 * Fica **acima** das contagens de cadastro de propósito: "quantos fornecedores
 * tenho" é a informação menos acionável da tela, e estava ocupando o lugar mais
 * nobre. O que abre uma reunião de acompanhamento é quanto foi pactuado, quanto
 * saiu e quanto ainda está na conta da entidade.
 *
 * Reusa o mesmo endpoint do relatório de execução — se somasse por conta
 * própria, o Dashboard poderia mostrar um número e o relatório outro.
 */
export function PainelExecucao() {
  const [totais, setTotais] = useState<Totais | null>(null);
  // As linhas já vinham nesta mesma chamada e eram descartadas depois de somadas
  // — o gráfico abaixo não custa requisição nenhuma, só deixa de jogar fora o
  // detalhe que o endpoint já entregava.
  const [linhas, setLinhas] = useState<LinhaExecucao[]>([]);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    relatorioExecucao()
      .then((linhas: LinhaExecucao[]) => {
        if (!vivo) return;
        setLinhas(linhas);
        setTotais({
          valorGlobal: linhas.reduce((s, l) => s + l.valorGlobal, 0),
          repassado: linhas.reduce((s, l) => s + l.repassado, 0),
          pago: linhas.reduce((s, l) => s + l.pago, 0),
          emPoderDaEntidade: linhas.reduce((s, l) => s + l.emPoderDaEntidade, 0),
          ajustes: linhas.length,
        });
      })
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * As parcerias com mais dinheiro parado na conta da entidade, primeiro.
   *
   * A ordenação é o gráfico inteiro. Por valor global ele viraria um ranking de
   * tamanho — que a tela de Relatórios já dá, e que não muda o que se faz hoje.
   * Ordenado pelo que está em poder da OSC, ele responde à pergunta seguinte à
   * faixa de totais logo acima: *de quem é* esse dinheiro parado.
   */
  const grafico = useMemo<LinhaEmpilhada[]>(
    () =>
      [...linhas]
        .filter((l) => l.valorGlobal > 0)
        .sort((a, b) => b.emPoderDaEntidade - a.emPoderDaEntidade)
        .slice(0, NO_GRAFICO)
        .map((l) => ({
          id: l.ajusteId,
          rotulo: l.entidadeNome,
          sub: l.numero ? `nº ${l.numero}` : l.codigoAjuste,
          anotacao:
            l.execucao === null
              ? '—'
              : `${(l.execucao * 100).toFixed(0)}% executado`,
          segmentos: [
            { rotulo: SERIES[0].rotulo, valor: l.pago, cor: SERIES[0].cor },
            { rotulo: SERIES[1].rotulo, valor: l.emPoderDaEntidade, cor: SERIES[1].cor },
            { rotulo: SERIES[2].rotulo, valor: l.aRepassar, cor: SERIES[2].cor },
          ],
        })),
    [linhas],
  );

  // Falha silenciosa: o Dashboard não pode ficar quebrado porque um painel não
  // carregou. O resto da tela continua útil.
  if (falhou || (totais && totais.ajustes === 0)) return null;

  const item = (rotulo: string, valor: number | null, destaque?: boolean) => (
    <div className="min-w-0 flex-1 px-4 py-3">
      <p className="truncate text-[11px] uppercase tracking-wide text-ink-400">{rotulo}</p>
      <p
        className={`mt-0.5 truncate text-lg font-semibold tabular-nums ${
          destaque ? 'text-brand-600 dark:text-brand-300' : 'text-ink-800 dark:text-ink-100'
        }`}
      >
        {valor === null ? '—' : formatarMoeda(valor)}
      </p>
    </div>
  );

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-2.5 dark:border-ink-800">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
          <Wallet className="h-4 w-4 text-brand-500" />
          Execução das parcerias
          {totais && <span className="text-xs font-normal text-ink-400">· {totais.ajustes} ajuste(s)</span>}
        </p>
        <Link
          to="/relatorios"
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Relatórios
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap divide-x divide-ink-100 dark:divide-ink-800">
        {item('Valor global', totais?.valorGlobal ?? null)}
        {item('Repassado', totais?.repassado ?? null)}
        {item('Pago pela OSC', totais?.pago ?? null)}
        {/* O número que ninguém tinha à mão: saiu do órgão e ainda não virou
            despesa. Não é irregular por si — é o que se quer acompanhar. */}
        {item('Em poder da OSC', totais?.emPoderDaEntidade ?? null, true)}
      </div>

      {/* O gráfico responde a pergunta que a faixa acima deixa no ar: os totais
          dizem *quanto* está parado; isto diz *de quem*. Some com menos de duas
          parcerias — com uma só, a barra não compara nada e repete o que os
          quatro números já disseram. */}
      {grafico.length >= 2 && (
        <div className="border-t border-ink-100 px-4 py-3 dark:border-ink-800">
          <p className="mb-2.5 text-[11px] uppercase tracking-wide text-ink-400">
            Onde está o dinheiro · {grafico.length} parcerias com mais saldo na entidade
          </p>
          <BarraEmpilhada linhas={grafico} />
          <div className="mt-3">
            <Legenda itens={SERIES} />
          </div>
        </div>
      )}
    </div>
  );
}
