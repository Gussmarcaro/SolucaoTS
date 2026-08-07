import type { DadosGerais, DadosGeraisDTO, Responsaveis, ResponsaveisDTO } from './dtos';

/** Port dos blocos singleton de certidões (Dados Gerais e Responsáveis). */
export interface ICertidoesPrestacaoRepository {
  obterDadosGerais(prestacaoId: string): Promise<DadosGerais | null>;
  salvarDadosGerais(prestacaoId: string, dados: DadosGeraisDTO): Promise<DadosGerais>;
  obterResponsaveis(prestacaoId: string): Promise<Responsaveis | null>;
  salvarResponsaveis(prestacaoId: string, dados: ResponsaveisDTO): Promise<Responsaveis>;
}
