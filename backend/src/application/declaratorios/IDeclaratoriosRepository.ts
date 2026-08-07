import type { Declaracoes, Parecer, Transparencia } from './dtos';

/** Port dos blocos declaratórios singleton (Declarações, Parecer, Transparência). */
export interface IDeclaratoriosRepository {
  obterDeclaracoes(prestacaoId: string): Promise<Declaracoes | null>;
  salvarDeclaracoes(prestacaoId: string, dados: Omit<Declaracoes, 'prestacaoId'>): Promise<Declaracoes>;
  obterParecer(prestacaoId: string): Promise<Parecer | null>;
  salvarParecer(prestacaoId: string, dados: Omit<Parecer, 'prestacaoId'>): Promise<Parecer>;
  obterTransparencia(prestacaoId: string): Promise<Transparencia | null>;
  salvarTransparencia(prestacaoId: string, dados: Omit<Transparencia, 'prestacaoId'>): Promise<Transparencia>;
}
