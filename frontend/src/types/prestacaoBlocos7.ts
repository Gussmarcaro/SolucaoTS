/** Bloco 20 — Dados Gerais da Entidade Beneficiária (identificadores de certidões). */
export interface DadosGerais {
  identCertidaoDadosGerais: string | null;
  identCertidaoCorpoDiretivo: string | null;
  identCertidaoMembrosConselho: string | null;
  identCertidaoResponsaveis: string | null;
}
export type DadosGeraisPayload = DadosGerais;

/** Bloco 21 — Responsáveis e Membros do Órgão Concessor. */
export interface Responsaveis {
  identCertidaoResponsaveis: string | null;
  identCertidaoComissaoAvaliacao: string | null;
  identCertidaoControleInterno: string | null;
  identCertidaoFiscalizacaoExecucao: string | null;
}
export type ResponsaveisPayload = Responsaveis;
