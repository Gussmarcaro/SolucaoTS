// Subestrutura reutilizada: Publicação (veículo 1..10)
export interface Publicacao {
  tipoVeiculo: number | null;
  nomeVeiculo: string | null;
  dataPublicacao: string | null;
  enderecoInternet: string | null;
}

// Bloco 28 — Demonstrações Contábeis
export interface Demonstracoes {
  publicacoes: Publicacao[];
  respNumeroCrc: string | null;
  respCpf: string | null;
  respSituacaoRegular: boolean | null;
}

// Bloco 29 — Publicações de Parecer ou Ata
export interface ItemParecerAta {
  tipoParecerAta: number;
  houvePublicacao: boolean | null;
  publicacoes: Publicacao[];
  conclusaoParecer: number | null;
}
export interface PublicacaoParecerAta {
  itens: ItemParecerAta[];
}

// Bloco 30 — Publicação do Relatório de Atividades (só Contrato de Gestão)
export interface PublicacaoRelAtividades {
  houvePublicacaoExercicio: boolean | null;
  publicacoes: Publicacao[];
}

// Bloco 32 — Prestação de Contas da Entidade Beneficiária
export interface PrestacaoEntidade {
  dataPrestacao: string | null;
  periodoReferenciaInicial: string | null;
  periodoReferenciaFinal: string | null;
}
