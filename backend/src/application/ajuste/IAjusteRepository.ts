import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { ArquivoAjuste, DadosAjuste, ListarAjustesParams, Paginado, TipoDocumentoAjuste } from './dtos';

/** Port de persistência de Ajuste. */
export interface IAjusteRepository {
  buscarPorId(id: string): Promise<Ajuste | null>;
  buscarPorCodigo(codigoAjuste: string): Promise<Ajuste | null>;
  entidadeExiste(entidadeBeneficiariaId: string): Promise<boolean>;
  clienteExiste(clienteId: string): Promise<boolean>;
  criar(dados: DadosAjuste): Promise<Ajuste>;
  atualizar(id: string, dados: DadosAjuste): Promise<Ajuste>;
  listar(params: ListarAjustesParams): Promise<Paginado<Ajuste>>;

  /** Grava (ou substitui) o PDF do documento indicado. */
  salvarDocumento(id: string, tipo: TipoDocumentoAjuste, arquivo: ArquivoAjuste): Promise<Ajuste>;
  /** Lê o PDF — a única consulta que carrega o binário. */
  obterDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<ArquivoAjuste | null>;
  removerDocumento(id: string, tipo: TipoDocumentoAjuste): Promise<Ajuste>;
}
