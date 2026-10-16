import type { ContaBancaria } from '@/core/contaBancaria/ContaBancaria';
import type { DadosContaBancaria } from './dtos';
import type { VinculoDeAjuste } from '@/core/contaBancaria/vinculos';

export interface IContaBancariaRepository {
  /**
   * As contas do órgão. Com `ajusteId`, **só as declaradas naquele ajuste**.
   *
   * O recorte existe porque a Execução é um portão por parceria: lançar receita
   * do convênio 01 na conta do convênio 02 é indistinguível de um lançamento
   * certo até alguém conferir extrato por extrato.
   *
   * Devolve **vazio** quando o ajuste não declarou conta nenhuma, e não a lista
   * inteira. É o contrário da conciliação, e de propósito: lá se **lê** um
   * extrato, e esconder tudo deixaria o usuário sem explicação; aqui se
   * **grava**, e oferecer a conta de outra parceria é exatamente o erro. A tela
   * diz o que falta e aponta onde declarar.
   */
  listar(apenasAtivas: boolean, ajusteId?: string): Promise<ContaBancaria[]>;
  /**
   * Quem declara cada conta — **todos** os vínculos conta↔ajuste do órgão.
   *
   * Uma consulta só para a grade inteira, em vez de uma por linha: a tabela é
   * pequena e a alternativa seria N+1 numa tela de cadastro.
   *
   * A leitura parte do **Ajuste**, que é raiz de tenant e já sai recortado pela
   * extension. `AjusteContaBancaria` não é raiz: consultá-la direto traria os
   * vínculos de todos os órgãos, e a coluna mostraria código de ajuste alheio
   * ao lado da conta de quem está olhando.
   */
  listarVinculos(): Promise<VinculoDeAjuste[]>;
  buscarPorId(id: string): Promise<ContaBancaria | null>;
  /** Duplicidade no órgão — a conta é única por banco, agência, número e tipo. */
  buscarDuplicada(dados: DadosContaBancaria): Promise<ContaBancaria | null>;
  criar(dados: DadosContaBancaria): Promise<ContaBancaria>;
  atualizar(id: string, dados: DadosContaBancaria): Promise<ContaBancaria>;
  definirAtivo(id: string, ativo: boolean): Promise<ContaBancaria>;
  /**
   * Busca da barra superior. Devolve poucas, já recortadas pelo órgão.
   *
   * Método próprio, e não o `listar` das grades como fazem os cadastros: os
   * três lançamentos que entraram na busca global têm `listar` de formatos
   * diferentes, e torcer os três para caber num só daria uma assinatura que
   * nenhuma tela usa.
   */
  buscarGlobal(termo: string, limite: number): Promise<ContaBancaria[]>;
  excluir(id: string): Promise<void>;
}
