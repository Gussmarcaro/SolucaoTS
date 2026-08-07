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

// ---- Subestrutura reutilizada: Publicação (veículo 1..10) ----
export interface Publicacao {
  tipoVeiculo: number | null; // 1..10
  nomeVeiculo: string | null; // obrigatório se tipo=10 (Outros)
  dataPublicacao: string | null; // ISO 'YYYY-MM-DD'
  enderecoInternet: string | null;
}

// ---- Bloco 28 — Demonstrações Contábeis ----
export interface DemonstracoesDTO {
  publicacoes?: Publicacao[];
  respNumeroCrc?: string | null;
  respCpf?: string | null;
  respSituacaoRegular?: boolean | null;
}
export interface Demonstracoes {
  prestacaoId: string;
  publicacoes: Publicacao[];
  respNumeroCrc: string | null;
  respCpf: string | null;
  respSituacaoRegular: boolean | null;
}

// ---- Bloco 29 — Publicações de Parecer ou Ata ----
export interface ItemParecerAta {
  tipoParecerAta: number; // 1..4
  houvePublicacao: boolean | null;
  publicacoes: Publicacao[];
  conclusaoParecer: number | null; // 1..5
}
export interface PublicacaoParecerAtaDTO {
  itens?: ItemParecerAta[];
}
export interface PublicacaoParecerAta {
  prestacaoId: string;
  itens: ItemParecerAta[];
}

// ---- Bloco 30 — Publicação do Relatório de Atividades (só Contrato de Gestão) ----
export interface PublicacaoRelAtividadesDTO {
  houvePublicacaoExercicio?: boolean | null;
  publicacoes?: Publicacao[];
}
export interface PublicacaoRelAtividades {
  prestacaoId: string;
  houvePublicacaoExercicio: boolean | null;
  publicacoes: Publicacao[];
}

// ---- Bloco 32 — Prestação de Contas da Entidade Beneficiária ----
export interface PrestacaoEntidadeDTO {
  dataPrestacao?: string | null;
  periodoReferenciaInicial?: string | null;
  periodoReferenciaFinal?: string | null;
}
export interface PrestacaoEntidade {
  prestacaoId: string;
  dataPrestacao: string | null;
  periodoReferenciaInicial: string | null;
  periodoReferenciaFinal: string | null;
}
