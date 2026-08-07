// ---- Bloco 24 — Declarações ----
export interface EmpresaPertencente {
  cnpj: string | null;
  cpf: string | null;
}
export interface Participacao {
  cpfDirigente: string | null;
  cpfsContratados: string[];
}
export interface DeclaracoesDTO {
  houveContratacao?: boolean | null;
  empresasPertencentes?: EmpresaPertencente[];
  houveParticipacao?: boolean | null;
  participacoes?: Participacao[];
  comprasAdequadas?: boolean | null;
}
export interface Declaracoes {
  prestacaoId: string;
  houveContratacao: boolean | null;
  empresasPertencentes: EmpresaPertencente[];
  houveParticipacao: boolean | null;
  participacoes: Participacao[];
  comprasAdequadas: boolean | null;
}

// ---- Bloco 33 — Parecer Conclusivo ----
export interface DeclaracaoAnalise {
  tipoDeclaracao: number; // 1..7
  declaracao: number | null; // 1=Sim, 2=Não, 3=Prejudicado
  justificativa: string | null;
}
export interface ParecerDTO {
  identificacaoParecer?: string | null;
  conclusaoParecer?: number | null; // 1..3
  consideracoesParecer?: string | null;
  declaracoes?: DeclaracaoAnalise[];
}
export interface Parecer {
  prestacaoId: string;
  identificacaoParecer: string | null;
  conclusaoParecer: number | null;
  consideracoesParecer: string | null;
  declaracoes: DeclaracaoAnalise[];
}

// ---- Bloco 34 — Transparência ----
export interface RequisitoAtende {
  requisito: number;
  atende: boolean;
}
export interface TransparenciaDTO {
  mantemSitio?: boolean | null;
  sitios?: string[];
  requisitos781?: RequisitoAtende[];
  requisitos83?: RequisitoAtende[];
  requisitosDivulgacao?: RequisitoAtende[];
}
export interface Transparencia {
  prestacaoId: string;
  mantemSitio: boolean | null;
  sitios: string[];
  requisitos781: RequisitoAtende[];
  requisitos83: RequisitoAtende[];
  requisitosDivulgacao: RequisitoAtende[];
}
