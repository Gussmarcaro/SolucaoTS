import type { Glosa } from '@/core/glosa/Glosa';
import type { DadosGlosa } from './dtos';

/** Port de persistência de Glosa (no escopo de uma Prestação). */
export interface IGlosaRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Glosa[]>;
  buscarPorId(id: string): Promise<Glosa | null>;
  docPertenceAPrestacao(prestacaoId: string, documentoFiscalId: string): Promise<boolean>;
  criar(prestacaoId: string, dados: DadosGlosa): Promise<Glosa>;
  atualizar(id: string, dados: DadosGlosa): Promise<Glosa>;
  excluir(id: string): Promise<void>;
}
