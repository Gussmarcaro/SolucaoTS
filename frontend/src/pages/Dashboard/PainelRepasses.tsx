import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { relatorioRepasses } from '@/services/relatorios.service';
import { ATRASO_RELEVANTE_DIAS, type LinhaRepasse } from '@/pages/Relatorios/tipos';
import { Dumbbell, type ParItem } from '@/components/graficos/Dumbbell';
import { Figura, Legenda } from '@/components/graficos/base';
import { emDias, normalizar } from '@/components/graficos/escala';
import { dataBr, formatarMoeda } from '@/lib/masks';

/** Quantas parcelas o gráfico desenha — as mais recentes. */
const NO_GRAFICO = 7;

/**
 * Repasses: previsto × realizado.
 *
 * O atraso de repasse é achado clássico do TCESP, e o dado sempre esteve no
 * banco — `RepassePrestacao` guarda as duas datas na mesma linha. Faltava
 * subtrair uma da outra e **mostrar a distância**, que é o que o dumbbell faz:
 * o atraso vira literalmente o comprimento do traço entre os dois pontos.
 *
 * Por isso não são duas barras lado a lado. Barras obrigam a comparar dois
 * comprimentos a partir de uma origem comum — responde "qual é maior", que não
 * é a pergunta. A pergunta é "quanto tempo entre um e outro".
 */
export function PainelRepasses() {
  const [linhas, setLinhas] = useState<LinhaRepasse[] | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    relatorioRepasses()
      .then((r) => vivo && setLinhas(r))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, []);

  if (falhou || !linhas || linhas.length < 2) return null;

  // As mais recentes pela data prevista: a pergunta é sobre o ciclo corrente,
  // não sobre o histórico inteiro — para isso existe a tela de Relatórios.
  const recentes = [...linhas]
    .filter((l) => emDias(l.dataPrevista) !== null)
    .sort((a, b) => (emDias(b.dataPrevista) ?? 0) - (emDias(a.dataPrevista) ?? 0))
    .slice(0, NO_GRAFICO)
    .reverse();

  if (recentes.length < 2) return null;

  // Janela do eixo: do primeiro previsto ao último evento, qualquer que seja.
  const marcos = recentes.flatMap((l) => [emDias(l.dataPrevista), emDias(l.dataRepasse)]).filter((d): d is number => d !== null);
  const inicio = Math.min(...marcos);
  const fim = Math.max(...marcos);
  // `normalizar` prende o valor em 0..1 e devolve 0 quando a janela tem
  // largura zero — todas as parcelas no mesmo dia é um caso real.
  const pos = (d: number | null) => (d === null ? null : normalizar(d, inicio, fim));

  const atrasadas = recentes.filter((l) => l.atrasoDias >= ATRASO_RELEVANTE_DIAS).length;

  const itens: ParItem[] = recentes.map((l, i) => {
    const previsto = emDias(l.dataPrevista)!;
    const realizado = emDias(l.dataRepasse);
    const alerta = l.atrasoDias >= ATRASO_RELEVANTE_DIAS;

    return {
      id: `${l.ajusteId}-${l.dataPrevista}-${i}`,
      rotulo: l.entidadeNome,
      sub: l.codigoAjuste,
      de: pos(previsto)!,
      para: pos(realizado),
      alerta,
      anotacao:
        realizado === null
          ? 'não repassado'
          : l.atrasoDias > 0
            ? `+${l.atrasoDias} emDias(s)`
            : 'no prazo',
      dica: (
        <>
          <strong className="font-semibold">{l.entidadeNome}</strong>
          <br />
          Previsto: {dataBr(l.dataPrevista)} · {formatarMoeda(l.valorPrevisto)}
          <br />
          Realizado: {realizado === null ? '—' : `${dataBr(l.dataRepasse)} · ${formatarMoeda(l.valorRepasse)}`}
          {l.justificativa && (
            <>
              <br />
              <span className="text-ink-400">{l.justificativa}</span>
            </>
          )}
        </>
      ),
    };
  });

  return (
    <Figura
      titulo="Repasses: previsto × realizado"
      icone={<CalendarClock className="h-4 w-4 text-brand-500" />}
      subtitulo={
        atrasadas > 0 ? (
          <>
            <strong className="font-semibold text-ink-700 dark:text-ink-200">
              {atrasadas} de {recentes.length} parcelas
            </strong>{' '}
            com {ATRASO_RELEVANTE_DIAS} dias ou mais de atraso
          </>
        ) : (
          <>Últimas {recentes.length} parcelas, todas dentro do prazo</>
        )
      }
      acao={
        <Link
          to="/relatorios"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <Dumbbell
        itens={itens}
        eixo={
          <>
            <span>{dataBr(recentes[0]?.dataPrevista)}</span>
            <span>{dataBr(recentes[recentes.length - 1]?.dataPrevista)}</span>
          </>
        }
      />
      <div className="mt-3">
        <Legenda
          itens={[
            { rotulo: 'Previsto', cor: 'var(--g-previsto)' },
            { rotulo: 'Realizado', cor: 'var(--g-realizado)' },
            { rotulo: `Atraso ≥ ${ATRASO_RELEVANTE_DIAS} dias`, cor: 'var(--g-rejeitado)' },
          ]}
        />
      </div>
    </Figura>
  );
}
