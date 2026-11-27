import type { ITransmissaoRepository } from './ITransmissaoRepository';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { podeRetificar } from '@/core/prestacao/trava';

export interface PrevisaoRetificacao {
  /** O que vai acontecer: retificar, ou converter a negativa em prestação. */
  acao: 'RETIFICAR' | 'CONVERTER_NEGATIVA';
  /** Exercícios posteriores que o TCESP vai excluir e que terão de ser reenviados. */
  posteriores: number[];
}

/**
 * Reabre uma prestação armazenada para uma nova versão.
 *
 * - **Prestação comum** vira **retificação** (manual v1.19, §2.7): o próximo
 *   envio vai com `retificacao: true` e substitui a anterior.
 * - **Declaração Negativa** vira **prestação de contas**: houve repasse afinal.
 *   A prestação sobrescreve a negativa sozinha — a não ser que existam
 *   prestações armazenadas de exercícios posteriores, e aí precisa ir como
 *   retificação (§2.8).
 *
 * Em ambos os casos, prestações posteriores armazenadas serão **excluídas**
 * pelo TCESP e terão de ser reenviadas. `prever` mostra isso antes, e
 * `confirmar` só reabre com o aceite explícito.
 */
export class RetificarPrestacaoUseCase {
  constructor(private readonly repo: ITransmissaoRepository) {}

  async prever(prestacaoId: string): Promise<PrevisaoRetificacao> {
    const p = await this.repo.carregar(prestacaoId);
    if (!p) throw new NotFoundError('Prestação não encontrada.');
    const motivo = podeRetificar(p);
    if (motivo) throw new BusinessError(motivo);
    return {
      acao: p.declaracaoNegativa ? 'CONVERTER_NEGATIVA' : 'RETIFICAR',
      posteriores: await this.repo.posterioresArmazenadas(p.ajusteId, p.ano),
    };
  }

  async confirmar(prestacaoId: string, cienteDosPosteriores: boolean): Promise<PrevisaoRetificacao> {
    const previsao = await this.prever(prestacaoId);
    if (previsao.posteriores.length && !cienteDosPosteriores)
      throw new BusinessError(
        `Retificar exclui no TCESP as prestações de ${previsao.posteriores.join(', ')}, que terão de ser reenviadas. Confirme para continuar.`,
      );

    await this.repo.reabrir(
      prestacaoId,
      previsao.acao === 'CONVERTER_NEGATIVA'
        ? { declaracaoNegativa: false, ehRetificacao: previsao.posteriores.length > 0 }
        : { declaracaoNegativa: false, ehRetificacao: true },
    );
    return previsao;
  }
}
