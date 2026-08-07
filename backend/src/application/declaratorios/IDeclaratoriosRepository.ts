import type {
  Declaracoes,
  Demonstracoes,
  Parecer,
  PrestacaoEntidade,
  PublicacaoParecerAta,
  PublicacaoRelAtividades,
  Transparencia,
} from './dtos';

/** Port dos blocos declaratórios singleton. */
export interface IDeclaratoriosRepository {
  obterDeclaracoes(prestacaoId: string): Promise<Declaracoes | null>;
  salvarDeclaracoes(prestacaoId: string, dados: Omit<Declaracoes, 'prestacaoId'>): Promise<Declaracoes>;
  obterParecer(prestacaoId: string): Promise<Parecer | null>;
  salvarParecer(prestacaoId: string, dados: Omit<Parecer, 'prestacaoId'>): Promise<Parecer>;
  obterTransparencia(prestacaoId: string): Promise<Transparencia | null>;
  salvarTransparencia(prestacaoId: string, dados: Omit<Transparencia, 'prestacaoId'>): Promise<Transparencia>;
  obterDemonstracoes(prestacaoId: string): Promise<Demonstracoes | null>;
  salvarDemonstracoes(prestacaoId: string, dados: Omit<Demonstracoes, 'prestacaoId'>): Promise<Demonstracoes>;
  obterPublicacaoParecerAta(prestacaoId: string): Promise<PublicacaoParecerAta | null>;
  salvarPublicacaoParecerAta(prestacaoId: string, dados: Omit<PublicacaoParecerAta, 'prestacaoId'>): Promise<PublicacaoParecerAta>;
  obterPublicacaoRelAtividades(prestacaoId: string): Promise<PublicacaoRelAtividades | null>;
  salvarPublicacaoRelAtividades(prestacaoId: string, dados: Omit<PublicacaoRelAtividades, 'prestacaoId'>): Promise<PublicacaoRelAtividades>;
  obterPrestacaoEntidade(prestacaoId: string): Promise<PrestacaoEntidade | null>;
  salvarPrestacaoEntidade(prestacaoId: string, dados: Omit<PrestacaoEntidade, 'prestacaoId'>): Promise<PrestacaoEntidade>;
}
