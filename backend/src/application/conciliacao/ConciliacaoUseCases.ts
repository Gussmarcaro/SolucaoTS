import type { IConciliacaoRepository } from './IConciliacaoRepository';
import type { ConciliarDTO, LinhaExtrato, ResultadoImportacaoOfx } from './dtos';
import { parseOfx } from '@/infrastructure/parsers/parseOfx';
import { sugerirConciliacao, JANELA_DIAS } from '@/core/conciliacao/sugerir';
import { BusinessError, NotFoundError } from '@/shared/errors';

/** Desloca uma data ISO em dias — a folga da janela de sugestão. */
function deslocar(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Conciliação bancária.
 *
 * É a única ferramenta do sistema que compara o que foi **lançado** com o que
 * de fato **aconteceu na conta**. Todo o resto — plano, cronograma, prestação —
 * confia no que alguém digitou; aqui o banco é a testemunha.
 *
 * Por isso ela revela duas coisas que nenhuma outra tela revela: o que saiu da
 * conta e ninguém lançou, e o que foi lançado duas vezes.
 */
export class ConciliacaoUseCases {
  constructor(private readonly repo: IConciliacaoRepository) {}

  async importar(buffer: Buffer): Promise<ResultadoImportacaoOfx> {
    const extrato = parseOfx(buffer);

    if (!extrato.lancamentos.length)
      throw new BusinessError(
        extrato.erros[0] ?? 'Nenhuma transação encontrada no arquivo.',
      );

    const { novas, repetidas } = await this.repo.importar(
      { banco: extrato.banco, agencia: extrato.agencia, conta: extrato.conta },
      extrato.lancamentos,
    );

    return {
      banco: extrato.banco,
      agencia: extrato.agencia,
      conta: extrato.conta,
      periodo: { inicial: extrato.dataInicial, final: extrato.dataFinal },
      lidas: extrato.lancamentos.length,
      novas,
      repetidas,
      // Os erros de linha não impedem a importação: um extrato de 200 linhas
      // com uma defeituosa é melhor importado com 199 do que recusado inteiro.
      erros: extrato.erros,
    };
  }

  /**
   * As linhas do período, cada uma com a sugestão de par quando há uma só.
   *
   * A sugestão é calculada aqui e não gravada: os lançamentos mudam, e uma
   * sugestão guardada apontaria para um pagamento já corrigido ou excluído.
   */
  async listar(filtros: { de?: string; ate?: string }): Promise<LinhaExtrato[]> {
    const linhas = await this.repo.listar(filtros);
    const pendentes = linhas.filter((l) => !l.conciliadoEm && !l.ignorado);
    if (!pendentes.length) return linhas;

    // A janela de busca é a do extrato mais a folga da compensação bancária.
    const datas = pendentes.map((l) => l.data).sort();
    const de = deslocar(datas[0], -JANELA_DIAS);
    const ate = deslocar(datas[datas.length - 1], JANELA_DIAS);

    const [pagamentos, receitas] = await Promise.all([
      this.repo.candidatosPagamento(de, ate),
      this.repo.candidatosReceita(de, ate),
    ]);

    const descricoes = await this.repo.descreverLancamentos({
      pagamentos: pagamentos.map((p) => p.id),
      receitas: receitas.map((r) => r.id),
    });

    /*
     * Um candidato só pode ser sugerido uma vez.
     *
     * Duas linhas do extrato com o mesmo valor apontariam para o mesmo
     * pagamento, e aceitar as duas concilia o mesmo dinheiro em dobro. Quem já
     * foi sugerido sai do conjunto — e a segunda linha fica sem sugestão, que é
     * a resposta honesta.
     */
    const usados = new Set<string>();

    return linhas.map((l) => {
      if (l.conciliadoEm || l.ignorado) return l;

      // Débito casa com pagamento; crédito, com receita. O dinheiro tem direção.
      const universo = (l.tipo === 'DEBITO' ? pagamentos : receitas).filter(
        (c) => !usados.has(c.id),
      );
      const achado = sugerirConciliacao({ valor: l.valor, data: l.data }, universo);
      if (!achado) return l;

      usados.add(achado.id);
      const d = descricoes.get(achado.id);
      return {
        ...l,
        sugestao: {
          id: achado.id,
          tipo: l.tipo === 'DEBITO' ? ('PAGAMENTO' as const) : ('RECEITA' as const),
          descricao: d?.descricao ?? '',
          valor: achado.valor,
          data: achado.data,
        },
      };
    });
  }

  /**
   * Concilia, ignora, ou desfaz.
   *
   * Desfazer é tão importante quanto conciliar: conciliação errada some de
   * vista, e sem caminho de volta a correção passa a exigir banco de dados.
   */
  async conciliar(id: string, dados: ConciliarDTO): Promise<LinhaExtrato> {
    const linha = await this.repo.buscarPorId(id);
    if (!linha) throw new NotFoundError('Lançamento do extrato não encontrado.');

    const pagamentoId = dados.pagamentoId?.trim() || null;
    const receitaId = dados.receitaId?.trim() || null;

    if (pagamentoId && receitaId)
      throw new BusinessError('Uma linha do extrato corresponde a um pagamento **ou** a uma receita, não aos dois.');

    // Débito é saída; receita é entrada. Trocar os dois faria o extrato
    // concordar com um lançamento de sinal oposto — e a conta continuaria
    // fechando por acaso, que é o pior jeito de fechar.
    if (linha.tipo === 'DEBITO' && receitaId)
      throw new BusinessError('Esta linha é um débito: corresponde a um pagamento, não a uma receita.');
    if (linha.tipo === 'CREDITO' && pagamentoId)
      throw new BusinessError('Esta linha é um crédito: corresponde a uma receita, não a um pagamento.');

    const ignorado = dados.ignorado ?? false;
    if (ignorado && (pagamentoId || receitaId))
      throw new BusinessError('Linha ignorada não se concilia com lançamento.');

    return this.repo.conciliar(id, {
      pagamentoId,
      receitaId,
      ignorado,
      observacao: dados.observacao?.trim() || null,
    });
  }
}
