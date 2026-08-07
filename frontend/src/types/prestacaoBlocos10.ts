import type { Publicacao } from './prestacaoBlocos9';

// Blocos 25/26/27 — Relatório Final da fiscalização
export interface RelatorioFinal {
  houveEmissao: boolean | null;
  conclusao: number | null;
  justificativa: string | null;
}

// Bloco 22 — Regulamento de Compras (só Contrato de Gestão)
export interface RegulamentoCompras {
  houvePublicacaoInicial: boolean | null;
  publicacoesInicial: Publicacao[];
  houveAlteracao: boolean | null;
  houvePublicacaoAlterado: boolean | null;
  publicacoesAlteracao: Publicacao[];
}

// Bloco 23 — Extrato de Execução Física e Financeira (só Termo de Parceria)
export interface Extrato {
  haExtrato: boolean | null;
  extratoConformeModelo: boolean | null;
  publicacoes: Publicacao[];
}

// Bloco 31 — Termo da Relação de Bens Cedidos (só Contrato de Gestão)
export interface TermoBens {
  termoCessaoPermissao: boolean | null;
}
