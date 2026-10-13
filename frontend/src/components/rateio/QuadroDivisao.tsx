import { formatarMoeda } from '@/lib/masks';
import type { ParcelaRateada, ParticipanteRateio } from '@/types/rateio';

/**
 * A divisão de um valor pelo quadro do rateio — quem leva quanto.
 *
 * **Uma tabela só, usada em dois lugares**: no lançamento da despesa (prévia,
 * enquanto se digita o valor) e no do pagamento (onde os lançamentos nascem).
 * Duas tabelas para a mesma divisão divergiriam no que não se vê — a linha de
 * recurso próprio, a casa do percentual, o destaque do ajuste — e o usuário
 * leria dois quadros diferentes da mesma nota.
 *
 * Nada aqui é enviado: quem divide de verdade é o servidor, com a mesma regra.
 */
export function QuadroDivisao({
  participantes,
  parcelas,
  ajusteSelecionado = null,
  marca = 'lançando',
}: {
  participantes: ParticipanteRateio[];
  /** De `ratearValor`, na mesma ordem dos participantes. */
  parcelas: ParcelaRateada[];
  /** O ajuste que o formulário está tratando; a linha dele ganha destaque. */
  ajusteSelecionado?: string | null;
  /** O que a etiqueta da linha em destaque diz — lançando, em execução… */
  marca?: string;
}) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-brand-200/60 dark:divide-brand-500/20">
        {participantes.map((p, i) => {
          /*
           * A linha do ajuste que está sendo lançado fica em destaque, e as
           * outras esmaecidas.
           *
           * Não é enfeite: o quadro mostra a nota inteira, mas só **uma**
           * daquelas parcelas pode ser paga naquele lançamento. Sem a marca, o
           * usuário lê "resta R$ 125,00" e supõe que pode pagá-los ali —
           * exatamente o erro que a regra do servidor passou a recusar.
           */
          const ehOAtual = !!ajusteSelecionado && p.ajusteId === ajusteSelecionado;
          const esmaecido = !!ajusteSelecionado && !ehOAtual;
          return (
            <tr
              key={p.id}
              className={
                ehOAtual
                  ? 'bg-brand-100/70 dark:bg-brand-500/20'
                  : esmaecido
                    ? 'opacity-45'
                    : undefined
              }
            >
              <td className="py-1 pl-1 pr-2">
                {/* A linha de recurso próprio não tem código de ajuste: ela se
                    identifica pelo nome que a entidade deu. */}
                <span
                  className="block truncate text-ink-700 dark:text-ink-200"
                  title={p.origem ?? p.entidadeNome ?? ''}
                >
                  {p.origem ?? p.ajusteCodigo}
                  {ehOAtual && (
                    <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-brand-400 dark:text-brand-300 dark:ring-brand-500/50">
                      {marca}
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-ink-400" title={p.ajusteObjeto ?? ''}>
                  {p.origem
                    ? 'recurso próprio da entidade — não é pago por nenhuma parceria'
                    : p.entidadeNome}
                </span>
              </td>
              <td className="w-20 py-1 text-right tabular-nums text-ink-500 dark:text-ink-400">
                {(parcelas[i]?.percentual ?? 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
                %
              </td>
              <td className="w-32 py-1 pr-1 text-right tabular-nums font-medium text-ink-800 dark:text-ink-100">
                {formatarMoeda(parcelas[i]?.valor ?? 0)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
