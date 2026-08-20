/**
 * Quem enxerga qual compromisso.
 *
 * Esta é a regra de segurança da agenda, e por isso mora no `core`, isolada e
 * testável: ela é a única coisa entre a agenda pessoal de alguém e o resto do
 * órgão. A interface **não** participa dela — filtro de tela esconde, não
 * protege, e a especificação é explícita: manipular filtro, URL ou id não pode
 * revelar compromisso nenhum.
 *
 * Precedência, da mais forte para a mais fraca:
 *
 * 1. **PARTICULAR** — só o criador. Nem administrador, nem suporte: perfil
 *    administrativo é autorização para operar o sistema, não para ler a agenda
 *    pessoal de um colega. Quem quiser essa exceção precisa criá-la de forma
 *    explícita e auditável, não herdá-la de um cargo.
 * 2. **RESTRITO** — criador, participantes convidados e quem estiver nos
 *    grupos convidados. O vínculo é com o **grupo**, não com a lista de membros
 *    do momento: quem entrar no grupo depois passa a ver, que é o que se espera
 *    de uma agenda de equipe.
 * 3. **ORGAO** — todos do órgão. O recorte por tenant continua valendo por
 *    cima: "todos" quer dizer todos do mesmo cliente.
 */

export type VisibilidadeCompromisso = 'PARTICULAR' | 'RESTRITO' | 'ORGAO';

export const VISIBILIDADES: VisibilidadeCompromisso[] = ['PARTICULAR', 'RESTRITO', 'ORGAO'];

/** Quem está perguntando. */
export interface Espectador {
  usuarioId: string;
  /** Grupo do usuário — o sistema tem um por usuário (`Usuario.grupoUsuarioId`). */
  grupoId: string | null;
}

/** O compromisso, na forma mínima que a decisão precisa. */
export interface CompromissoVisivel {
  visibilidade: VisibilidadeCompromisso;
  criadoPor: string | null;
  participantesIds: string[];
  gruposIds: string[];
}

/**
 * Decide se `quem` pode enxergar `c`.
 *
 * Função pura de propósito: é a mesma regra que o repositório traduz para SQL,
 * e tê-la aqui permite prová-la sem banco (`verificar:agenda`). Se as duas
 * divergirem, a verificação é onde isso aparece.
 */
export function podeVer(c: CompromissoVisivel, quem: Espectador): boolean {
  // O criador sempre enxerga o que criou, em qualquer visibilidade.
  if (c.criadoPor && c.criadoPor === quem.usuarioId) return true;

  switch (c.visibilidade) {
    case 'PARTICULAR':
      return false;
    case 'ORGAO':
      return true;
    case 'RESTRITO':
      return (
        c.participantesIds.includes(quem.usuarioId) ||
        (!!quem.grupoId && c.gruposIds.includes(quem.grupoId))
      );
  }
}

/**
 * Quem pode **alterar** o compromisso.
 *
 * Ser convidado dá direito de ver, não de mexer: a reunião é de quem a marcou.
 * Fora o criador, só o responsável designado — que é quem responde por ela.
 *
 * Quem administra a agenda do órgão passa por aqui com `administraAgenda`,
 * que a camada de permissão resolve pela faixa **Total** do recurso `AGENDA` —
 * reusando o RBAC que já existe, sem inventar uma escala paralela de ações.
 */
export function podeAlterar(
  c: CompromissoVisivel & { responsavelId?: string | null },
  quem: Espectador,
  administraAgenda = false,
): boolean {
  if (c.criadoPor && c.criadoPor === quem.usuarioId) return true;
  if (c.responsavelId && c.responsavelId === quem.usuarioId) return true;

  // Compromisso particular não se administra de fora: o poder administrativo
  // alcança a agenda compartilhada do órgão, não a pessoal de alguém.
  if (c.visibilidade === 'PARTICULAR') return false;
  return administraAgenda;
}
