import type { ContaBancaria } from '@/core/contaBancaria/ContaBancaria';
import type { DadosContaBancaria } from './dtos';

export interface IContaBancariaRepository {
  listar(apenasAtivas: boolean): Promise<ContaBancaria[]>;
  buscarPorId(id: string): Promise<ContaBancaria | null>;
  /** Duplicidade no órgão — a conta é única por banco, agência, número e tipo. */
  buscarDuplicada(dados: DadosContaBancaria): Promise<ContaBancaria | null>;
  criar(dados: DadosContaBancaria): Promise<ContaBancaria>;
  atualizar(id: string, dados: DadosContaBancaria): Promise<ContaBancaria>;
  definirAtivo(id: string, ativo: boolean): Promise<ContaBancaria>;
  /**
   * A conta está em uso por algum ajuste?
   *
   * Decide entre excluir e inativar: conta citada num ajuste já enviado não
   * pode sumir — o vínculo apontaria para o nada, e o histórico deixaria de se
   * explicar.
   */
  /**
   * Busca da barra superior. Devolve poucas, já recortadas pelo órgão.
   *
   * Método próprio, e não o `listar` das grades como fazem os cadastros: os
   * três lançamentos que entraram na busca global têm `listar` de formatos
   * diferentes, e torcer os três para caber num só daria uma assinatura que
   * nenhuma tela usa.
   */
  buscarGlobal(termo: string, limite: number): Promise<ContaBancaria[]>;
  emUso(id: string): Promise<boolean>;
  excluir(id: string): Promise<void>;
}
