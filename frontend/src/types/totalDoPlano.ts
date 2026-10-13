/**
 * Espelho de `core/planoAplicacao/totalDoPlano.ts`.
 *
 * A tela precisa da resposta **enquanto se digita** — o erro que isto pega é
 * justamente o de quem confunde a coluna mensal com a anual, e descobri-lo só
 * ao salvar faria a pessoa digitar trinta rubricas para levar o aviso no fim.
 *
 * Travado por `totalDoPlano.test.ts`, com os mesmos números do backend.
 */

const FOLGA = 0.005;

export type SituacaoPlano = 'CONFERE' | 'SEM_PLANO' | 'A_MENOR' | 'A_MAIOR';

export interface ConferenciaDoPlano {
  situacao: SituacaoPlano;
  totalPlano: number;
  valorAjuste: number;
  diferenca: number;
  confere: boolean;
}

export function conferirTotalDoPlano(totalPlano: number, valorAjuste: number): ConferenciaDoPlano {
  // Entrada não-finita vira zero: `NaN` faz toda comparação falhar e a cascata
  // cairia em "a maior", acusando de gastar demais quem não tem plano nenhum.
  const total = Number.isFinite(totalPlano) ? Math.round(totalPlano * 100) / 100 : 0;
  const ajuste = Number.isFinite(valorAjuste) ? Math.round(valorAjuste * 100) / 100 : 0;
  const diferenca = Math.round((total - ajuste) * 100) / 100;

  const situacao: SituacaoPlano =
    total <= 0
      ? 'SEM_PLANO'
      : Math.abs(diferenca) <= FOLGA
        ? 'CONFERE'
        : diferenca < 0
          ? 'A_MENOR'
          : 'A_MAIOR';

  return { situacao, totalPlano: total, valorAjuste: ajuste, diferenca, confere: situacao === 'CONFERE' };
}
