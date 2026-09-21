import { useEffect, useState } from 'react';
import { Loader2, Split } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatarMoeda } from '@/lib/masks';
import { listarRateios } from '@/services/rateios.service';
import { calcularRateio, type Rateio } from '@/types/rateio';
import type { DocumentoFiscal } from '@/types/prestacaoBlocos';

/**
 * Divide um valor entre os ajustes — **espelho do `ratearValor` do backend**.
 *
 * Existe só para a **prévia**: o usuário precisa ver quanto vai para cada
 * ajuste antes de confirmar. Quem divide de verdade é o servidor, com a mesma
 * regra — aqui o número é informativo, e nenhum valor calculado nesta tela é
 * enviado.
 *
 * Divide em **centavos**, pelo maior resto: aplicar os percentuais exibidos
 * faria três ajustes iguais somarem R$ 99,99 de R$ 100,00, e a prévia
 * mostraria um total que não é o da nota.
 */
function ratear(total: number, bases: number[]): number[] {
  const centavos = Math.round(total * 100);
  const soma = bases.reduce((s, b) => s + (b > 0 ? b : 0), 0);
  const exatos = bases.map((b) => (soma > 0 ? ((b > 0 ? b : 0) / soma) * centavos : centavos / bases.length));
  const pisos = exatos.map((e) => Math.floor(e));
  let sobra = centavos - pisos.reduce((s, v) => s + v, 0);
  const ordem = exatos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  const out = [...pisos];
  for (const { i } of ordem) {
    if (sobra <= 0) break;
    out[i] += 1;
    sobra -= 1;
  }
  return out.map((c) => c / 100);
}

/**
 * O pagamento de uma despesa rateada.
 *
 * A despesa acontece uma vez e é paga por vários ajustes. Antes, quem lançava a
 * nota do material comum tinha de saber de cabeça que 75% eram de um ajuste e
 * 25% de outro, fazer a conta e lançar dois pagamentos — e a segunda parcela, a
 * menor, é a que se esquece. O dinheiro saía inteiro do banco e aparecia pela
 * metade na prestação.
 *
 * Aqui o quadro faz a conta, a tela mostra o resultado antes de confirmar, e os
 * lançamentos nascem juntos.
 */
export function PainelRateio({
  doc,
  pronto,
  onRatear,
  rateando,
}: {
  doc: DocumentoFiscal;
  /** Os campos comuns (data, fonte, meio…) já estão preenchidos? */
  pronto: boolean;
  onRatear: () => void;
  rateando: boolean;
}) {
  const [rateio, setRateio] = useState<Rateio | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarRateios({ page: 1, pageSize: 200 })
      .then((r) => vivo && setRateio(r.data.find((x) => x.id === doc.rateioId) ?? null))
      .catch(() => undefined)
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [doc.rateioId]);

  if (carregando) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!rateio || !rateio.participantes.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Esta nota está marcada como <strong>proveniente de rateio</strong>, mas o método escolhido
        não foi encontrado ou está sem ajustes no quadro. Lance o pagamento manualmente, ou acerte
        o rateio em Cadastro → Financeiro.
      </div>
    );
  }

  // O líquido é o que de fato sai da conta — ratear o bruto faria a soma dos
  // pagamentos não bater com o extrato.
  const liquido = Math.round((doc.valorBruto - doc.valorEncargos) * 100) / 100;
  // O percentual nao e gravado: recalcula-se das bases, como na tela do
  // Rateio. Guardado, ele divergiria da base assim que alguem a editasse.
  const { linhas } = calcularRateio(
    rateio.participantes.map((p) => ({ ajusteId: p.ajusteId, base: p.base })),
  );

  const parcelas = ratear(
    liquido,
    rateio.participantes.map((p) => p.base),
  );

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink-800 dark:text-ink-100">
            Despesa rateada — {rateio.titulo}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Líquido de {formatarMoeda(liquido)} dividido pelo quadro do rateio.
          </p>
        </div>
        <Button type="button" size="sm" onClick={onRatear} disabled={!pronto || rateando}>
          {rateando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Split className="h-4 w-4" />}
          Lançar rateado
        </Button>
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-brand-200/60 dark:divide-brand-500/20">
          {rateio.participantes.map((p, i) => (
            <tr key={p.id}>
              <td className="py-1 pr-2">
                <span className="block truncate text-ink-700 dark:text-ink-200" title={p.entidadeNome}>
                  {p.ajusteCodigo}
                </span>
                <span className="block truncate text-xs text-ink-400" title={p.ajusteObjeto}>
                  {p.entidadeNome}
                </span>
              </td>
              <td className="w-20 py-1 text-right tabular-nums text-ink-500 dark:text-ink-400">
                {(linhas[i]?.percentualExibido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
              </td>
              <td className="w-32 py-1 text-right tabular-nums font-medium text-ink-800 dark:text-ink-100">
                {formatarMoeda(parcelas[i] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-xs text-ink-400">
        {pronto ? (
          <>
            Um pagamento por ajuste será lançado, <strong>cada um saindo da conta do seu próprio
            ajuste</strong> — é assim que o dinheiro se move, e é o que faz cada débito casar com o
            extrato daquela conta. O valor vem do quadro; não se digita.
          </>
        ) : (
          'Preencha a data e o meio de pagamento para liberar o lançamento rateado.'
        )}
      </p>
      <p className="mt-1 text-xs text-ink-400">
        Ajuste sem conta cadastrada — ou com mais de uma conta corrente, onde não há o que deduzir —
        usa a conta informada abaixo, e você corrige no lançamento.
      </p>
    </div>
  );
}
