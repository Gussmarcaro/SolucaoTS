export type AcaoAuditoria =
  | 'ALTERACAO'
  | 'EXCLUSAO'
  | 'INATIVACAO'
  | 'REATIVACAO'
  | 'CRIACAO'
  /** Dados pessoais mascarados foram revelados na tela (LGPD art. 37). */
  | 'VISUALIZACAO';

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
  VISUALIZACAO: 'Consulta a dados pessoais',
};

export const ACAO_TONE: Record<AcaoAuditoria, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  ALTERACAO: 'brand',
  EXCLUSAO: 'danger',
  INATIVACAO: 'warning',
  REATIVACAO: 'success',
  CRIACAO: 'success',
  VISUALIZACAO: 'neutral',
};

/** Nome amigável do model, para a tela não expor o jargão do schema. */
/**
 * Rótulo de cada cadastro na tela de auditoria.
 *
 * Precisa cobrir todo model auditável: o filtro lista todos, e o que não
 * estiver aqui aparece com o nome cru do banco ("DocumentoRegularidade").
 * `npm run verificar:auditoria` cobra a cobertura quando um cadastro novo entra.
 */
export const ENTIDADE_LABEL: Record<string, string> = {
  Cliente: 'Órgão Concessor',
  Usuario: 'Usuário',
  Empresa: 'Empresa',
  Fornecedor: 'Fornecedor',
  Colaborador: 'Colaborador',
  ContratoFirmado: 'Contrato firmado',
  BemCedido: 'Bem cedido',
  ServidorCedidoCadastro: 'Servidor cedido',
  GrupoUsuario: 'Grupo de usuários',
  UsuarioGrupo: 'Vínculo usuário–grupo',
  Permissao: 'Permissão',
  GrupoUsuarioPermissao: 'Permissão do grupo',
  EntidadeBeneficiaria: 'Entidade beneficiária',
  MembroDiretoria: 'Membro da diretoria',
  AtaDiretoriaArquivo: 'Ata da diretoria',
  MembroConselho: 'Membro de conselho',
  DocumentoRegularidade: 'Documento de regularidade',
  Certidao: 'Certidão',
  Ajuste: 'Ajuste',
  TermoAditivo: 'Termo aditivo',
  Programa: 'Programa',
  Meta: 'Meta',
  PlanoAplicacaoItem: 'Plano de aplicação',
  CronogramaDesembolsoItem: 'Cronograma de desembolso',
  BemCedidoCadastro: 'Bem cedido (ajuste)',
  EmpenhoCadastro: 'Empenho (ajuste)',
  PrestacaoContas: 'Prestação de contas',
  AjustesSaldo: 'Ajustes de saldo',
  DadosGeraisBeneficiaria: 'Dados gerais da beneficiária',
  ResponsaveisConcessor: 'Responsáveis do concessor',
  DeclaracoesPrestacao: 'Declarações',
  ParecerConclusivo: 'Parecer conclusivo',
  Transparencia: 'Transparência',
  DemonstracoesContabeis: 'Demonstrações contábeis',
  PublicacaoParecerAta: 'Publicação de parecer/ata',
  PublicacaoRelatorioAtividades: 'Publicação do relatório de atividades',
  PrestacaoContasEntidade: 'Prestação da entidade',
  RelatorioFinal: 'Relatório final',
  RegulamentoCompras: 'Regulamento de compras',
  ExtratoFisicoFinanceiro: 'Extrato físico-financeiro',
  TermoBensCedidos: 'Termo de bens cedidos',
  RelacaoEmpregado: 'Empregado',
  BemPrestacao: 'Bem da prestação',
  Contrato: 'Contrato da prestação',
  DocumentoFiscal: 'Documento fiscal',
  Pagamento: 'Pagamento',
  Disponibilidade: 'Disponibilidade',
  Receita: 'Receita',
  ServidorCedido: 'Servidor cedido (prestação)',
  Desconto: 'Desconto',
  Devolucao: 'Devolução',
  Glosa: 'Glosa',
  EmpenhoPrestacao: 'Empenho',
  RepassePrestacao: 'Repasse',
  RelatorioAtividadeMeta: 'Relatório de atividades',
  Projeto: 'Projeto',
  Tarefa: 'Tarefa',
  Compromisso: 'Compromisso da agenda',
  CompromissoParticipante: 'Participante de compromisso',
  CompromissoGrupo: 'Grupo em compromisso',
  CompromissoAlerta: 'Lembrete de compromisso',
  Titular: 'Consulta de titular (LGPD)',
};

export const rotuloEntidade = (e: string): string => ENTIDADE_LABEL[e] ?? e;
