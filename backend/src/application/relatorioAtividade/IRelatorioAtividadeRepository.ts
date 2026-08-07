import type { AfericaoMeta } from '@/core/relatorioAtividade/AfericaoMeta';
import type { DadosAfericaoMeta } from './dtos';

/** Port de persistência do Relatório de Atividades (aferições de meta). */
export interface IRelatorioAtividadeRepository {
  listarPorPrestacao(prestacaoId: string): Promise<AfericaoMeta[]>;
  buscarPorId(id: string): Promise<AfericaoMeta | null>;
  buscarDuplicado(
    prestacaoId: string,
    nomePrograma: string,
    codigoMeta: string,
    periodo: number,
  ): Promise<AfericaoMeta | null>;
  criar(prestacaoId: string, dados: DadosAfericaoMeta): Promise<AfericaoMeta>;
  atualizar(id: string, dados: DadosAfericaoMeta): Promise<AfericaoMeta>;
  excluir(id: string): Promise<void>;
}
