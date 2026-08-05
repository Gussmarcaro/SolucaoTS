import type { Fornecedor } from '@/core/fornecedor/Fornecedor';
import type { DadosFornecedor, ListarFornecedoresParams, Paginado } from './dtos';

/** Port de persistência de Fornecedor / Prestador. */
export interface IFornecedorRepository {
  buscarPorId(id: string): Promise<Fornecedor | null>;
  buscarPorDocumento(documento: string): Promise<Fornecedor | null>;
  criar(dados: DadosFornecedor): Promise<Fornecedor>;
  atualizar(id: string, dados: DadosFornecedor): Promise<Fornecedor>;
  definirAtivo(id: string, ativo: boolean): Promise<Fornecedor>;
  listar(params: ListarFornecedoresParams): Promise<Paginado<Fornecedor>>;
}
