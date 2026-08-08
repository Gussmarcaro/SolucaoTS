import type { Empresa } from '@/core/empresa/Empresa';
import type {
  AtualizarEmpresaDTO,
  CriarEmpresaDTO,
  ListarEmpresasParams,
  Paginado,
} from './dtos';

/** Port de persistência de Empresa. */
export interface IEmpresaRepository {
  buscarPorId(id: string): Promise<Empresa | null>;
  buscarPorCnpj(cnpj: string): Promise<Empresa | null>;
  criar(dados: CriarEmpresaDTO): Promise<Empresa>;
  atualizar(id: string, dados: AtualizarEmpresaDTO): Promise<Empresa>;
  definirAtivo(id: string, ativo: boolean): Promise<Empresa>;
  listar(params: ListarEmpresasParams): Promise<Paginado<Empresa>>;
}
