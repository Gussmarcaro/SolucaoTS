import type {
  Declaracoes,
  Demonstracoes,
  Extrato,
  Parecer,
  PrestacaoEntidade,
  PublicacaoParecerAta,
  PublicacaoRelAtividades,
  RegulamentoCompras,
  RelatorioFinal,
  TermoBens,
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
  obterRelatorioFinal(prestacaoId: string): Promise<RelatorioFinal | null>;
  salvarRelatorioFinal(prestacaoId: string, dados: Omit<RelatorioFinal, 'prestacaoId'>): Promise<RelatorioFinal>;
  obterRegulamentoCompras(prestacaoId: string): Promise<RegulamentoCompras | null>;
  salvarRegulamentoCompras(prestacaoId: string, dados: Omit<RegulamentoCompras, 'prestacaoId'>): Promise<RegulamentoCompras>;
  obterExtrato(prestacaoId: string): Promise<Extrato | null>;
  salvarExtrato(prestacaoId: string, dados: Omit<Extrato, 'prestacaoId'>): Promise<Extrato>;
  obterTermoBens(prestacaoId: string): Promise<TermoBens | null>;
  salvarTermoBens(prestacaoId: string, dados: Omit<TermoBens, 'prestacaoId'>): Promise<TermoBens>;
}
