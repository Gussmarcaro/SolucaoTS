import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';
import type { DadosCronogramaItem } from './dtos';

/** Port de persistência do Cronograma de Desembolso (no escopo de um Ajuste). */
export interface ICronogramaRepository {
  listarPorAjuste(ajusteId: string): Promise<CronogramaItem[]>;
  /** Substitui TODO o cronograma do ajuste pelos itens informados. */
  substituir(ajusteId: string, itens: DadosCronogramaItem[]): Promise<CronogramaItem[]>;
}
