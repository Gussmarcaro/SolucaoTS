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
  /** Se o órgão empenha o repasse — governa a aba de Empenhos. */
  orgaoEmpenha: boolean;
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
  // Receitas e Repasses num item só: para quem preenche, é o mesmo assunto —
  // o dinheiro que entrou. No documentoJSON continuam sendo DOIS blocos
  // distintos e obrigatórios, com campos próprios; a união é de tela.
  { chave: 'receitas', nome: 'Receitas e Repasses' },
  { chave: 'servidoresCedidos', nome: 'Servidores Cedidos', exceto: ['TERMO_COLABORACAO', 'TERMO_FOMENTO'] },
  { chave: 'descontos', nome: 'Descontos' },
  { chave: 'devolucoes', nome: 'Devoluções' },
  { chave: 'glosas', nome: 'Glosas' },
  { chave: 'empenhos', nome: 'Empenhos' },
  { chave: 'ajustesSaldo', nome: 'Ajustes de Saldo' },
  { chave: 'atividades', nome: 'Relatório de Atividades (Metas)' },
  { chave: 'dadosGerais', nome: 'Dados Gerais da Beneficiária' },
  { chave: 'responsaveis', nome: 'Responsáveis do Concessor' },
  { chave: 'declaracoes', nome: 'Declarações' },
  { chave: 'parecerConclusivo', nome: 'Parecer Conclusivo' },
  { chave: 'transparencia', nome: 'Transparência' },
  { chave: 'demonstracoes', nome: 'Demonstrações Contábeis' },
  { chave: 'publicacaoParecerAta', nome: 'Publicações de Parecer/Ata' },
  { chave: 'prestacaoEntidade', nome: 'Prestação de Contas da Entidade' },
  { chave: 'publicacaoRelAtividades', nome: 'Publicação do Rel. de Atividades', somente: ['CONTRATO_GESTAO'] },
  { chave: 'termoBensCedidos', nome: 'Termo de Bens Cedidos', somente: ['CONTRATO_GESTAO'] },
  { chave: 'regulamentoCompras', nome: 'Regulamento de Compras', somente: ['CONTRATO_GESTAO'] },
  { chave: 'comissaoAvaliacao', nome: 'Relatório da Comissão de Avaliação', somente: ['CONTRATO_GESTAO'] },
  { chave: 'extratoFisicoFinanceiro', nome: 'Extrato Físico-Financeiro', somente: ['TERMO_PARCERIA'] },
  { chave: 'relatorioGovernamental', nome: 'Relatório Governamental de Análise', somente: ['CONVENIO'] },
  { chave: 'relatorioMonitoramento', nome: 'Relatório de Monitoramento e Avaliação', somente: ['TERMO_COLABORACAO', 'TERMO_FOMENTO'] },
];

/**
 * Filtra os blocos aplicáveis.
 *
 * Além do tipo de ajuste, o **Empenho** depende do órgão: só aparece para quem
 * empenha o repasse. Atenção ao que isso significa no envio — `empenhos` é
 * bloco obrigatório nos 5 tipos, e esconder a aba faz o documento sair com a
 * lista vazia. Por isso a marca do órgão nasce ligada: desligá-la é uma decisão
 * de quem administra, não um esquecimento.
 */
export function blocosAplicaveis(
  tipo: TipoAjuste,
  opcoes: { orgaoEmpenha?: boolean } = {},
): BlocoDef[] {
  const empenha = opcoes.orgaoEmpenha !== false;
  return BLOCOS.filter((b) => {
    if (b.somente && !b.somente.includes(tipo)) return false;
    if (b.exceto && b.exceto.includes(tipo)) return false;
    if (b.chave === 'empenhos' && !empenha) return false;
    return true;
  });
}
