// Bloco 24 — Declarações
export interface EmpresaPertencente {
  cnpj: string | null;
  cpf: string | null;
}
export interface Participacao {
  cpfDirigente: string | null;
  cpfsContratados: string[];
}
export interface Declaracoes {
  houveContratacao: boolean | null;
  empresasPertencentes: EmpresaPertencente[];
  houveParticipacao: boolean | null;
  participacoes: Participacao[];
  comprasAdequadas: boolean | null;
}

// Bloco 33 — Parecer Conclusivo
export interface DeclaracaoAnalise {
  tipoDeclaracao: number;
  declaracao: number | null;
  justificativa: string | null;
}
export interface Parecer {
  identificacaoParecer: string | null;
  conclusaoParecer: number | null;
  consideracoesParecer: string | null;
  declaracoes: DeclaracaoAnalise[];
}

// Bloco 34 — Transparência
export interface RequisitoAtende {
  requisito: number;
  atende: boolean;
}
export interface Transparencia {
  mantemSitio: boolean | null;
  sitios: string[];
  requisitos781: RequisitoAtende[];
  requisitos83: RequisitoAtende[];
  requisitosDivulgacao: RequisitoAtende[];
}
