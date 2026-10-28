import type { LancamentoOfx } from '@/infrastructure/parsers/parseOfx';
import type { LinhaExtrato, ConciliarDTO, ContaDoExtrato } from './dtos';
import type { Candidato } from '@/core/conciliacao/sugerir';
import type { ContaBancariaChave } from '@/core/conciliacao/contas';

export interface IConciliacaoRepository {
  /**
   * Grava as linhas novas e devolve quantas entraram.
   *
   * Idempotente pelo FITID: reimportar o mesmo arquivo, ou um período que se
   * sobrepõe ao anterior, não duplica. É o caso comum — ninguém baixa extratos
   * com fronteiras perfeitas.
   */
  importar(
    conta: { banco: number | null; agencia: string | null; conta: string | null },
    lancamentos: LancamentoOfx[],
  ): Promise<{ novas: number; repetidas: number }>;

  listar(filtros: { de?: string; ate?: string }): Promise<LinhaExtrato[]>;
  buscarPorId(id: string): Promise<LinhaExtrato | null>;
  conciliar(id: string, dados: ConciliarDTO): Promise<LinhaExtrato>;

  /**
   * As contas declaradas no ajuste — o que liga o extrato à parceria.
   *
   * O extrato guarda banco, agência e conta por extenso, não uma chave: ele é
   * do banco e existe mesmo que a conta saia do cadastro do ajuste depois.
   */
  contasDoAjuste(ajusteId: string): Promise<ContaBancariaChave[]>;
  /**
   * As contas que **o extrato importado** tem, com quantas linhas cada uma.
   *
   * Existe para a tela poder explicar a lista vazia. Dentro de um ajuste as
   * linhas são recortadas pelas contas dele, e quando o extrato é de outra
   * conta o resultado é zero linha — indistinguível, para quem olha, de
   * "nenhum extrato importado". Esta consulta é o que separa as duas coisas.
   */
  contasDoExtrato(filtros: { de?: string; ate?: string }): Promise<ContaDoExtrato[]>;

  /**
   * Pagamentos e receitas ainda sem conciliação, para casar e para escolher à mão.
   *
   * Com `ajusteId`, só os daquela parceria — um débito do banco não pode ser
   * sugerido contra o pagamento de outro ajuste.
   */
  candidatosPagamento(de: string, ate: string, ajusteId?: string): Promise<Candidato[]>;
  candidatosReceita(de: string, ate: string, ajusteId?: string): Promise<Candidato[]>;
  /** Descrição legível dos candidatos — só para exibir a sugestão. */
  descreverLancamentos(
    ids: { pagamentos: string[]; receitas: string[] },
  ): Promise<Map<string, { descricao: string; valor: number; data: string }>>;
}
