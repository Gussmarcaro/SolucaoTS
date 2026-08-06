import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { DadosAjuste, ListarAjustesParams, Paginado } from './dtos';

/** Port de persistência de Ajuste. */
export interface IAjusteRepository {
  buscarPorId(id: string): Promise<Ajuste | null>;
  buscarPorCodigo(codigoAjuste: string): Promise<Ajuste | null>;
  entidadeExiste(entidadeBeneficiariaId: string): Promise<boolean>;
  criar(dados: DadosAjuste): Promise<Ajuste>;
  atualizar(id: string, dados: DadosAjuste): Promise<Ajuste>;
  listar(params: ListarAjustesParams): Promise<Paginado<Ajuste>>;
}
