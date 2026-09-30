import type { LancamentoOfx } from '@/infrastructure/parsers/parseOfx';
import type { LinhaExtrato, ConciliarDTO } from './dtos';
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
