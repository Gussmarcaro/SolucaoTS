/** Entidade de domínio — Grupo de Usuários (perfil de acesso). */
export interface Grupo {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  totalMembros: number; // usuários vinculados
  criadoEm: Date;
  atualizadoEm: Date;
}

/** Resumo para combobox (só id + nome). */
export interface GrupoResumo {
  id: string;
  nome: string;
}
