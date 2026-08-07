/** Bloco 20 — Dados Gerais da Entidade Beneficiária (identificadores de certidões). */
export interface DadosGeraisDTO {
  identCertidaoDadosGerais?: string | null;
  identCertidaoCorpoDiretivo?: string | null;
  identCertidaoMembrosConselho?: string | null;
  identCertidaoResponsaveis?: string | null;
}

export interface DadosGerais extends DadosGeraisDTO {
  prestacaoId: string;
}

/** Bloco 21 — Responsáveis e Membros do Órgão Concessor. */
export interface ResponsaveisDTO {
  identCertidaoResponsaveis?: string | null;
  identCertidaoComissaoAvaliacao?: string | null;
  identCertidaoControleInterno?: string | null;
  identCertidaoFiscalizacaoExecucao?: string | null;
}

export interface Responsaveis extends ResponsaveisDTO {
  prestacaoId: string;
}
