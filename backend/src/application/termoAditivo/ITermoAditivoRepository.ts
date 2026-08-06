import type { TermoAditivo } from '@/core/termoAditivo/TermoAditivo';
import type { DadosTermoAditivo } from './dtos';

/** Port de persistência de Termo Aditivo (sempre no escopo de um Ajuste). */
export interface ITermoAditivoRepository {
  listarPorAjuste(ajusteId: string): Promise<TermoAditivo[]>;
  buscarPorId(id: string): Promise<TermoAditivo | null>;
  criar(ajusteId: string, dados: DadosTermoAditivo): Promise<TermoAditivo>;
  atualizar(id: string, dados: DadosTermoAditivo): Promise<TermoAditivo>;
  excluir(id: string): Promise<void>;
}
