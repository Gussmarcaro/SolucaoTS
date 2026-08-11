import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { ArquivoEstatuto, DadosEntidade, ListarEntidadesParams, Paginado } from './dtos';

/** Port de persistência de Entidade Beneficiária. */
export interface IEntidadeRepository {
  buscarPorId(id: string): Promise<EntidadeBeneficiaria | null>;
  buscarPorCnpj(cnpj: string): Promise<EntidadeBeneficiaria | null>;
  criar(dados: DadosEntidade): Promise<EntidadeBeneficiaria>;
  atualizar(id: string, dados: DadosEntidade): Promise<EntidadeBeneficiaria>;
  definirAtivo(id: string, ativo: boolean): Promise<EntidadeBeneficiaria>;
  listar(params: ListarEntidadesParams): Promise<Paginado<EntidadeBeneficiaria>>;

  /**
   * Grava (ou substitui) o PDF do estatuto. `dataAlteracao` só é gravada quando
   * informada — o caso de uso decide se a troca conta como alteração.
   */
  salvarEstatuto(
    id: string,
    arquivo: ArquivoEstatuto,
    dataAlteracao?: Date,
  ): Promise<EntidadeBeneficiaria>;
  /** Lê o PDF — a única consulta que carrega o binário. */
  obterEstatuto(id: string): Promise<ArquivoEstatuto | null>;
  /** Apaga o PDF, preservando as datas do estatuto. */
  removerEstatuto(id: string, dataAlteracao?: Date): Promise<EntidadeBeneficiaria>;
}
