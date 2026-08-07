import type { TipoAjuste } from './ajuste';

export type StatusPrestacao =
  | 'EM_ELABORACAO'
  | 'ENVIADO'
  | 'ARMAZENADO'
  | 'REJEITADO'
  | 'SUBSTITUIDO'
  | 'EXCLUIDO';

export const STATUS_PRESTACAO_LABEL: Record<StatusPrestacao, string> = {
  EM_ELABORACAO: 'Em elaboração',
  ENVIADO: 'Enviado',
  ARMAZENADO: 'Armazenado',
  REJEITADO: 'Rejeitado',
  SUBSTITUIDO: 'Substituído',
  EXCLUIDO: 'Excluído',
};

export type Tone = 'brand' | 'success' | 'danger' | 'warning' | 'neutral';

export const STATUS_PRESTACAO_TONE: Record<StatusPrestacao, Tone> = {
  EM_ELABORACAO: 'warning',
  ENVIADO: 'brand',
  ARMAZENADO: 'success',
  REJEITADO: 'danger',
  SUBSTITUIDO: 'neutral',
  EXCLUIDO: 'neutral',
};

export interface Prestacao {
  id: string;
  ajusteId: string;
  ajusteCodigo: string;
  ajusteTipo: TipoAjuste;
  entidadeNome: string;
  tipoDocumento: string;
  ano: number;
  mes: number;
  status: StatusPrestacao;
  protocolo: string | null;
  ehRetificacao: boolean;
  dataEnvio: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarPrestacaoPayload {
  ajusteId: string;
  ano: number;
  ehRetificacao?: boolean;
}

export interface FiltrosPrestacao {
  status?: string;
  ano?: number;
  ajusteId?: string;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Blocos do documento JSON da prestação e sua aplicabilidade por tipo de ajuste (§7). */
export interface BlocoDef {
  chave: string;
  nome: string;
  somente?: TipoAjuste[];
  exceto?: TipoAjuste[];
}

export const BLOCOS: BlocoDef[] = [
  { chave: 'empregados', nome: 'Relação de Empregados' },
  { chave: 'bens', nome: 'Relação de Bens' },
  { chave: 'contratos', nome: 'Contratos' },
  { chave: 'documentosFiscais', nome: 'Documentos Fiscais' },
  { chave: 'pagamentos', nome: 'Pagamentos' },
  { chave: 'disponibilidades', nome: 'Disponibilidades' },
  { chave: 'receitas', nome: 'Receitas' },
  { chave: 'servidoresCedidos', nome: 'Servidores Cedidos', exceto: ['TERMO_COLABORACAO', 'TERMO_FOMENTO'] },
  { chave: 'descontos', nome: 'Descontos' },
  { chave: 'devolucoes', nome: 'Devoluções' },
  { chave: 'glosas', nome: 'Glosas' },
  { chave: 'empenhos', nome: 'Empenhos' },
  { chave: 'repasses', nome: 'Repasses' },
  { chave: 'atividades', nome: 'Relatório de Atividades (Metas)' },
  { chave: 'dadosGerais', nome: 'Dados Gerais da Beneficiária' },
  { chave: 'responsaveis', nome: 'Responsáveis do Concessor' },
  { chave: 'regulamentoCompras', nome: 'Regulamento de Compras', somente: ['CONTRATO_GESTAO'] },
  { chave: 'comissaoAvaliacao', nome: 'Relatório da Comissão de Avaliação', somente: ['CONTRATO_GESTAO'] },
  { chave: 'extratoFisicoFinanceiro', nome: 'Extrato Físico-Financeiro', somente: ['TERMO_PARCERIA'] },
  { chave: 'relatorioGovernamental', nome: 'Relatório Governamental de Análise', somente: ['CONVENIO'] },
  { chave: 'relatorioMonitoramento', nome: 'Relatório de Monitoramento e Avaliação', somente: ['TERMO_COLABORACAO', 'TERMO_FOMENTO'] },
];

/** Filtra os blocos aplicáveis a um tipo de ajuste. */
export function blocosAplicaveis(tipo: TipoAjuste): BlocoDef[] {
  return BLOCOS.filter((b) => {
    if (b.somente && !b.somente.includes(tipo)) return false;
    if (b.exceto && b.exceto.includes(tipo)) return false;
    return true;
  });
}
