import { BusinessError, NotFoundError } from '@/shared/errors';
import {
  montarRelacaoTransferidos,
  type DadosRelacao,
  type RelacaoTransferidos,
} from '@/core/documento/relacaoTransferidos';
import type { Folha } from '@/core/documento/folha';
import {
  montarTermoConsentimento,
  type DadosTermoConsentimento,
} from '@/core/documento/termoConsentimento';
import {
  montarTermoCiencia,
  type DadosTermoCiencia,
} from '@/core/documento/termoCiencia';

/**
 * Os documentos que o sistema gera para assinatura.
 *
 * ## Por que é um módulo e não um relatório
 *
 * Relatório responde pergunta de gestão; isto produz **peça de processo**. O
 * que vai aqui é o texto oficial do TCESP preenchido com o cadastro — e por
 * isso a regra inteira mora no `core`, pura, com o texto transcrito dos
 * modelos. Este caso de uso é só o encanamento: busca os dados, chama o
 * montador, devolve a folha.
 *
 * O modelo em branco qualquer um baixa no site do Tribunal. O que não existe
 * em lugar nenhum é o modelo **preenchido**, com os quatro signatários certos,
 * e com a lista do que falta cadastrar para completá-lo.
 */
export interface IDocumentoRepository {
  /** Dados do órgão de quem está logado. Null se o contexto não tiver órgão. */
  dadosDoOrgao(): Promise<DadosTermoConsentimento | null>;
  /**
   * Dados do Termo de Ciência de um ajuste.
   *
   * `prestacaoId` muda duas linhas do cabeçalho — valor **repassado** e
   * exercício, em vez do valor do ajuste —, porque é o que a nota (1) do modelo
   * determina quando o termo instrui prestação de contas.
   */
  dadosDoTermoCiencia(
    ajusteId: string,
    prestacaoId?: string,
  ): Promise<DadosTermoCiencia | null>;
  /** Dados do RP-04 do órgão logado, no exercício. */
  dadosDaRelacao(exercicio: number): Promise<DadosRelacao | null>;
}

export class DocumentoUseCases {
  constructor(private readonly repo: IDocumentoRepository) {}

  /** ANEXO PC-02 — Termo de Consentimento (contas bancárias). */
  async termoConsentimento(): Promise<Folha> {
    const dados = await this.repo.dadosDoOrgao();
    if (!dados) throw new NotFoundError('Órgão não encontrado.');
    return montarTermoConsentimento(dados);
  }

  /** ANEXO RP-04 — Relação dos Valores Transferidos, do órgão, no exercício. */
  async relacaoTransferidos(exercicio: number): Promise<RelacaoTransferidos> {
    if (!Number.isInteger(exercicio) || exercicio < 2000 || exercicio > 2100)
      throw new BusinessError('Informe o exercício (ano) da relação.');
    const dados = await this.repo.dadosDaRelacao(exercicio);
    if (!dados) throw new NotFoundError('Órgão não encontrado.');
    return montarRelacaoTransferidos(dados);
  }

  /** ANEXO RP-05/07/09/11 — Termo de Ciência e de Notificação. */
  async termoCiencia(ajusteId: string, prestacaoId?: string): Promise<Folha> {
    const dados = await this.repo.dadosDoTermoCiencia(ajusteId, prestacaoId);
    if (!dados) throw new NotFoundError('Ajuste não encontrado.');
    return montarTermoCiencia(dados);
  }
}
