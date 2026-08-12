import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { ArquivoTermoCiencia, DadosAjuste, ListarAjustesParams, Paginado } from './dtos';

/** Port de persistência de Ajuste. */
export interface IAjusteRepository {
  buscarPorId(id: string): Promise<Ajuste | null>;
  buscarPorCodigo(codigoAjuste: string): Promise<Ajuste | null>;
  entidadeExiste(entidadeBeneficiariaId: string): Promise<boolean>;
  clienteExiste(clienteId: string): Promise<boolean>;
  criar(dados: DadosAjuste): Promise<Ajuste>;
  atualizar(id: string, dados: DadosAjuste): Promise<Ajuste>;
  listar(params: ListarAjustesParams): Promise<Paginado<Ajuste>>;

  /** Grava (ou substitui) o PDF do Termo de Ciência e Notificação. */
  salvarTermoCiencia(id: string, arquivo: ArquivoTermoCiencia): Promise<Ajuste>;
  /** Lê o PDF — a única consulta que carrega o binário. */
  obterTermoCiencia(id: string): Promise<ArquivoTermoCiencia | null>;
  removerTermoCiencia(id: string): Promise<Ajuste>;
}
