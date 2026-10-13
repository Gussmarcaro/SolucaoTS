import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { ArquivoAjuste, DadosAjuste, ListarAjustesParams, Paginado, TipoDocumentoAjuste } from './dtos';

/** Port de persistência de Ajuste. */
export interface IAjusteRepository {
  buscarPorId(id: string): Promise<Ajuste | null>;
  buscarPorCodigo(codigoAjuste: string): Promise<Ajuste | null>;
  entidadeExiste(entidadeBeneficiariaId: string): Promise<boolean>;
  criar(dados: DadosAjuste): Promise<Ajuste>;
  atualizar(id: string, dados: DadosAjuste): Promise<Ajuste>;
  listar(params: ListarAjustesParams): Promise<Paginado<Ajuste>>;

  /** Grava (ou substitui) o PDF do documento indicado. */
  salvarDocumento(id: string, tipo: TipoDocumentoAjuste, arquivo: ArquivoAjuste): Promise<Ajuste>;
  /** Lê o PDF — a única consulta que carrega o binário. */
  obterDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<ArquivoAjuste | null>;
  removerDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<Ajuste>;

  /**
   * O total do Plano de Aplicação (todos os exercícios) e quanto o ajuste vale
   * hoje, já com os termos aditivos somados.
   *
   * Os dois vêm juntos de propósito: pedi-los em duas chamadas abriria a janela
   * em que um aditivo entra entre uma e outra, e o bloqueio acusaria uma
   * divergência que não existe.
   */
  totaisDoPlano(id: string): Promise<{ totalDoPlano: number; valorDoAjuste: number }>;
}
