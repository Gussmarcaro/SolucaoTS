import type { CronogramaItem } from '@/core/cronograma/CronogramaItem';
import type { DadosCronogramaItem } from './dtos';

/** Port de persistência do Cronograma de Desembolso (no escopo de um Ajuste). */
export interface ICronogramaRepository {
  listarPorAjuste(ajusteId: string): Promise<CronogramaItem[]>;
  /** Substitui TODO o cronograma do ajuste pelos itens informados. */
  substituir(ajusteId: string, itens: DadosCronogramaItem[]): Promise<CronogramaItem[]>;
  /** Substitui só o exercício informado — ver a razão no port do plano. */
  substituirAno(ajusteId: string, ano: number, itens: DadosCronogramaItem[]): Promise<CronogramaItem[]>;
  /** Os exercícios que o cronograma já tem. */
  exercicios(ajusteId: string): Promise<number[]>;
}
