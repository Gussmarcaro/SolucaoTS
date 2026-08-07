import type { AjustesSaldo } from './dtos';

export interface IAjustesSaldoRepository {
  obter(prestacaoId: string): Promise<AjustesSaldo | null>;
  salvar(prestacaoId: string, dados: Omit<AjustesSaldo, 'prestacaoId'>): Promise<AjustesSaldo>;
}
