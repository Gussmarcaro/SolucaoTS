/** Ação registrada na trilha. */
export type AcaoAuditoria = 'ALTERACAO' | 'EXCLUSAO' | 'INATIVACAO' | 'REATIVACAO' | 'CRIACAO';

/**
 * Entrada da trilha de auditoria.
 *
 * `alteracoes` varia conforme a ação: em ALTERACAO traz só os campos que
 * mudaram (`{ campo: { de, para } }`); em EXCLUSAO, o registro completo; em
 * operações de lote, a quantidade e o filtro aplicado.
 */
export interface RegistroAuditoria {
  id: string;
  ocorridoEm: Date;
  usuarioId: string | null;
  usuarioNome: string;
  entidade: string;
  registroId: string;
  acao: AcaoAuditoria;
  alteracoes: unknown;
  rota: string | null;
}
