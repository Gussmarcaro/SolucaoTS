export type TipoAlerta =
  | 'PRESTACAO_REJEITADA'
  | 'CERTIDAO'
  | 'CADASTRO_AJUSTE'
  | 'CADASTRO_ADITIVO'
  | 'DECLARACAO_NEGATIVA'
  | 'PRESTACAO_CONTAS'
  | 'COMPROMISSO';

export type UrgenciaAlerta = 'VENCIDO' | 'CRITICO' | 'PROXIMO';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  urgencia: UrgenciaAlerta;
  titulo: string;
  detalhe: string;
  dias: number | null;
  referenciaId: string | null;
  /** Tarefa de acompanhamento aberta para este prazo, quando existe. */
  tarefa: { id: string; status: string } | null;
}

/**
 * Alertas que uma tarefa concluída faz sumir do sino — espelha
 * `ALERTAS_SILENCIAVEIS` do backend, que é quem de fato decide.
 *
 * Aqui serve só para o texto do painel: nos demais tipos a tarefa é registro
 * do trabalho, e o aviso continua até o dado mudar (a certidão ser renovada, a
 * prestação ser aceita). Dizer o contrário na tela seria prometer o que o
 * servidor não faz.
 */
export const ALERTAS_SILENCIAVEIS: TipoAlerta[] = [
  'CADASTRO_AJUSTE',
  'CADASTRO_ADITIVO',
  'DECLARACAO_NEGATIVA',
];

/** Esboço da tarefa que o alerta gera — o formulário abre já preenchido. */
export function tarefaDoAlerta(a: Alerta) {
  const prazo = new Date();
  prazo.setDate(prazo.getDate() + Math.max(0, a.dias ?? 0));
  return {
    titulo: a.titulo,
    descricao: a.detalhe,
    prazoLegal: prazo.toISOString().slice(0, 10),
    prioridade: a.urgencia === 'PROXIMO' ? ('ALTA' as const) : ('URGENTE' as const),
    // Só os alertas de ajuste/aditivo carregam id de Ajuste; nos outros o
    // `referenciaId` aponta para outra coisa (certidão, órgão, prestação) e
    // usá-lo como ajuste criaria um vínculo falso.
    ajusteId:
      a.tipo === 'CADASTRO_AJUSTE' || a.tipo === 'CADASTRO_ADITIVO' ? a.referenciaId : null,
    origemAlerta: a.id,
  };
}

export const URGENCIA_LABEL: Record<UrgenciaAlerta, string> = {
  VENCIDO: 'Vencidos',
  CRITICO: 'Vencem em até 7 dias',
  PROXIMO: 'Próximos',
};

export const URGENCIA_TONE: Record<UrgenciaAlerta, 'danger' | 'warning' | 'neutral'> = {
  VENCIDO: 'danger',
  CRITICO: 'warning',
  PROXIMO: 'neutral',
};

/** Rótulo do prazo. `null` quando o alerta não é sobre data (rejeição). */
export function rotuloDias(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias < 0) return `vencido há ${Math.abs(dias)}d`;
  if (dias === 0) return 'vence hoje';
  return `em ${dias}d`;
}

/**
 * Para onde cada alerta leva. Como na busca global, a rota é decisão da
 * interface — o backend devolve o tipo e o id, e não conhece as telas.
 */
export function rotaDoAlerta(a: Alerta): string {
  switch (a.tipo) {
    case 'PRESTACAO_REJEITADA':
      return a.referenciaId ? `/prestacao-contas/${a.referenciaId}` : '/prestacao-contas';
    case 'CERTIDAO':
      return '/cadastro/entidades';
    case 'CADASTRO_AJUSTE':
    case 'CADASTRO_ADITIVO':
      return a.referenciaId ? `/cadastro/ajustes/${a.referenciaId}` : '/cadastro/ajustes';
    case 'DECLARACAO_NEGATIVA':
      return '/orgaos';
    case 'PRESTACAO_CONTAS':
      return '/prestacao-contas';
    case 'COMPROMISSO':
      return '/agenda';
  }
}
