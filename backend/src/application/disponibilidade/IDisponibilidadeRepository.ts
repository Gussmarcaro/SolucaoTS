import type { Disponibilidade } from '@/core/disponibilidade/Disponibilidade';
import type { DadosDisponibilidade } from './dtos';
import type { SaldoSugerido } from './saldoContabil';

/** Port de persistência de Disponibilidade (no escopo de uma Prestação). */
export interface IDisponibilidadeRepository {
  listarPorPrestacao(prestacaoId: string): Promise<Disponibilidade[]>;
  buscarPorId(id: string): Promise<Disponibilidade | null>;
  criar(prestacaoId: string, dados: DadosDisponibilidade): Promise<Disponibilidade>;
  atualizar(id: string, dados: DadosDisponibilidade): Promise<Disponibilidade>;
  excluir(id: string): Promise<void>;

  /**
   * O movimento de cada conta da parceria até o último dia do exercício.
   *
   * É o que permite **sugerir** o saldo contábil em vez de pedi-lo digitado.
   * Parte das contas declaradas no ajuste: conta que a parceria não declara
   * não tem por que aparecer na disponibilidade dela.
   */
  saldosSugeridos(prestacaoId: string): Promise<SaldoSugerido[]>;

  /**
   * Saldo do fundo fixo — valor único da prestação, irmão de `saldos` no bloco
   * Disponibilidades do JSON e obrigatório no schema do TCESP.
   */
  obterSaldoFundoFixo(prestacaoId: string): Promise<number>;
  definirSaldoFundoFixo(prestacaoId: string, valor: number): Promise<number>;
}
