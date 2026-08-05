import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { DadosEntidade, ListarEntidadesParams, Paginado } from './dtos';

/** Port de persistência de Entidade Beneficiária. */
export interface IEntidadeRepository {
  buscarPorId(id: string): Promise<EntidadeBeneficiaria | null>;
  buscarPorCnpj(cnpj: string): Promise<EntidadeBeneficiaria | null>;
  criar(dados: DadosEntidade): Promise<EntidadeBeneficiaria>;
  atualizar(id: string, dados: DadosEntidade): Promise<EntidadeBeneficiaria>;
  definirAtivo(id: string, ativo: boolean): Promise<EntidadeBeneficiaria>;
  listar(params: ListarEntidadesParams): Promise<Paginado<EntidadeBeneficiaria>>;
}
