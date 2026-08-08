import type { Disponibilidade } from '@/core/disponibilidade/Disponibilidade';
import type { DadosDisponibilidade } from './dtos';

/** Port de persistência de Disponibilidade (no escopo de uma Prestação). */
export interface IDisponibilidadeRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Disponibilidade[]>;
  buscarPorId(id: string): Promise<Disponibilidade | null>;
  criar(prestacaoId: string, dados: DadosDisponibilidade): Promise<Disponibilidade>;
  atualizar(id: string, dados: DadosDisponibilidade): Promise<Disponibilidade>;
  excluir(id: string): Promise<void>;

  /**
   * Saldo do fundo fixo — valor único da prestação, irmão de `saldos` no bloco
   * Disponibilidades do JSON e obrigatório no schema do TCESP.
   */
  obterSaldoFundoFixo(prestacaoId: string): Promise<number>;
  definirSaldoFundoFixo(prestacaoId: string, valor: number): Promise<number>;
}
