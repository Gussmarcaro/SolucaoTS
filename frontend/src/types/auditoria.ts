export type AcaoAuditoria = 'ALTERACAO' | 'EXCLUSAO' | 'INATIVACAO' | 'REATIVACAO' | 'CRIACAO';

/** Um campo alterado, como gravado no diff. */
export interface CampoAlterado {
  de: unknown;
  para: unknown;
}

export interface RegistroAuditoria {
  id: string;
  ocorridoEm: string;
  usuarioId: string | null;
  usuarioNome: string;
  /** Nome do model afetado, ex.: "Fornecedor". */
  entidade: string;
  registroId: string;
  /** Rótulo do registro no momento do evento (razão social, nome, número). */
  registroDescricao: string | null;
  acao: AcaoAuditoria;
  /**
   * ALTERACAO: `{ campo: { de, para } }` · EXCLUSAO: o registro completo ·
   * lote: `{ quantidade, filtro }`.
   */
  alteracoes: Record<string, unknown> | null;
  rota: string | null;
}

export const ACAO_LABEL: Record<AcaoAuditoria, string> = {
  ALTERACAO: 'Alteração',
  EXCLUSAO: 'Exclusão',
  INATIVACAO: 'Inativação',
  REATIVACAO: 'Reativação',
  CRIACAO: 'Inclusão',
};

export const ACAO_TONE: Record<AcaoAuditoria, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  ALTERACAO: 'brand',
  EXCLUSAO: 'danger',
  INATIVACAO: 'warning',
  REATIVACAO: 'success',
  CRIACAO: 'success',
};

/** Nome amigável do model, para a tela não expor o jargão do schema. */
export const ENTIDADE_LABEL: Record<string, string> = {
  Cliente: 'Órgão Concessor',
  Usuario: 'Usuário',
  Empresa: 'Empresa',
  Fornecedor: 'Fornecedor',
  Colaborador: 'Colaborador',
  ContratoFirmado: 'Contrato',
  BemCedido: 'Bem cedido',
  ServidorCedidoCadastro: 'Servidor cedido',
  GrupoUsuario: 'Grupo de usuários',
  EntidadeBeneficiaria: 'Entidade beneficiária',
  Ajuste: 'Ajuste',
  PrestacaoContas: 'Prestação de contas',
  DocumentoFiscal: 'Documento fiscal',
  Pagamento: 'Pagamento',
  Disponibilidade: 'Disponibilidade',
  Receita: 'Receita',
  Desconto: 'Desconto',
  Devolucao: 'Devolução',
  Glosa: 'Glosa',
  EmpenhoPrestacao: 'Empenho',
  RepassePrestacao: 'Repasse',
  RelacaoEmpregado: 'Empregado',
  BemPrestacao: 'Bem da prestação',
  ServidorCedido: 'Servidor cedido (prestação)',
  Contrato: 'Contrato da prestação',
  TermoAditivo: 'Termo aditivo',
  Programa: 'Programa',
  Meta: 'Meta',
};

export const rotuloEntidade = (e: string): string => ENTIDADE_LABEL[e] ?? e;
