/**
 * Prazo da Prestação de Contas (Fase V): anual, até 30/06 do exercício
 * subsequente ao repasse (repasse em Y → entrega até 30/06 de Y+1).
 * Retorna o ciclo atualmente em aberto.
 */
export function prazoPrestacao(hoje: Date = new Date()): { exercicio: number; deadline: Date } {
  const ano = hoje.getFullYear();
  const deadlineEsteAno = new Date(ano, 5, 30, 23, 59, 59, 999); // 30/06 (mês 5 = junho)
  if (hoje.getTime() <= deadlineEsteAno.getTime()) return { exercicio: ano - 1, deadline: deadlineEsteAno };
  return { exercicio: ano, deadline: new Date(ano + 1, 5, 30, 23, 59, 59, 999) };
}

/** Dias corridos entre hoje e a data (negativo = vencido). */
export function diasAte(data: Date, hoje: Date = new Date()): number {
  const d0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const d1 = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
  return Math.round((d1 - d0) / 86400000);
}

export function rotuloPrazo(dias: number): string {
  if (dias < 0) return `vencido há ${Math.abs(dias)}d`;
  if (dias === 0) return 'vence hoje';
  return `em ${dias}d`;
}

export function tonePrazo(dias: number): 'danger' | 'warning' | 'neutral' {
  if (dias <= 7) return 'danger';
  if (dias <= 30) return 'warning';
  return 'neutral';
}
