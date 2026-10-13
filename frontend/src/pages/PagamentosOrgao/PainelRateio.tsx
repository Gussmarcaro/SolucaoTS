import { useEffect, useState } from 'react';
import { Loader2, Split } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuadroDivisao } from '@/components/rateio/QuadroDivisao';
import { formatarMoeda } from '@/lib/masks';
import { listarRateios } from '@/services/rateios.service';
import { ratearValor, type ParcelaRateada, type Rateio } from '@/types/rateio';
import type { DocumentoFiscal } from '@/types/prestacaoBlocos';

/**
 * O rateio de uma nota, com as parcelas já calculadas.
 *
 * Existe como hook porque **duas partes da tela precisam do mesmo número**: o
 * painel, que mostra a divisão, e o formulário, que limita o valor à parcela do
 * ajuste escolhido. Cada um calculando por si divergiria no centavo do maior
 * resto — e a divergência apareceria como uma recusa de R$ 0,01 que ninguém
 * saberia explicar.
 *
 * A conta em si é a de `ratearValor`, em `types/rateio.ts`: espelho do backend,
 * compartilhada com a prévia do lançamento da despesa.
 */
export function useRateioDaNota(doc: DocumentoFiscal | null) {
  const [rateio, setRateio] = useState<Rateio | null>(null);
  const [carregando, setCarregando] = useState(false);

  const rateioId = doc?.rateioProveniente ? doc.rateioId : null;

  useEffect(() => {
    if (!rateioId) {
      setRateio(null);
      return;
    }
    let vivo = true;
    setCarregando(true);
    listarRateios({ page: 1, pageSize: 200 })
      .then((r) => vivo && setRateio(r.data.find((x) => x.id === rateioId) ?? null))
      .catch(() => undefined)
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [rateioId]);

  // O líquido é o que de fato sai da conta — ratear o bruto faria a soma dos
  // pagamentos não bater com o extrato.
  const liquido = doc ? Math.round((doc.valorBruto - doc.valorEncargos) * 100) / 100 : 0;
  const participantes = rateio?.participantes ?? [];
  // O percentual não é gravado: recalcula-se das bases, como na tela do
  // Rateio. Guardado, ele divergiria da base assim que alguém a editasse.
  const parcelas = ratearValor(
    liquido,
    participantes.map((p) => ({ ajusteId: p.ajusteId, base: p.base })),
  );

  /** A parte de um ajuste nesta nota; `null` quando ele não está no quadro. */
  const parcelaDoAjuste = (ajusteId: string | null): number | null => {
    if (!ajusteId) return null;
    const i = participantes.findIndex((p) => p.ajusteId === ajusteId);
    return i < 0 ? null : (parcelas[i]?.valor ?? 0);
  };

  return { rateio, carregando, liquido, parcelas, parcelaDoAjuste };
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
  pronto,
  onRatear,
  rateando,
  rateio,
  carregando,
  liquido,
  parcelas,
  ajusteSelecionado,
}: {
  /** Os campos comuns (data, fonte, meio…) já estão preenchidos? */
  pronto: boolean;
  onRatear: () => void;
  rateando: boolean;
  /** Vem de `useRateioDaNota`, no formulário — ver a nota do hook. */
  rateio: Rateio | null;
  carregando: boolean;
  liquido: number;
  parcelas: ParcelaRateada[];
  /** O ajuste que o formulário está lançando; a linha dele ganha destaque. */
  ajusteSelecionado: string | null;
}) {
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

      <QuadroDivisao
        participantes={rateio.participantes}
        parcelas={parcelas}
        ajusteSelecionado={ajusteSelecionado}
      />

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
