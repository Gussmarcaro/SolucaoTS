import type { ContextoConferencia, DadosMontagem, Pendencia } from './tipos';

/**
 * O que ainda falta nesta prestação.
 *
 * **Não é a pergunta que `validarPrestacao` responde**, e a diferença é o
 * motivo desta função existir: `erros` é o que o **Tribunal rejeita**;
 * pendência é o que **passa na validação e mesmo assim está errado**.
 *
 * O JSON Schema do TCESP aceita `documentos_fiscais: []`. Uma prestação sem
 * nenhuma nota, sem nenhum pagamento e sem nenhum empenho é estruturalmente
 * válida: ela é transmitida, é aceita, e volta como inconformidade meses
 * depois. Quem responde antes disso é esta conferência.
 *
 * A regra de projeto é **não gritar à toa**: bloco vazio só vira pendência
 * onde vazio é esquecimento, nunca onde vazio é estado legítimo. Desconto,
 * devolução e glosa costumam ser zero numa parceria que correu bem, e bem
 * cedido idem — apontá-los ensinaria a ignorar o painel, que é exatamente o
 * que um painel de pendências não pode fazer. Pelo mesmo motivo, o que depende
 * de informação que esta função não tem (se o ajuste tem metas, se há plano de
 * aplicação) só é apontado quando o contexto confirma que deveria estar lá.
 *
 * Função pura: recebe os dados e o contexto, devolve a lista. Coberta por
 * `npm run verificar:conferencia`, sem banco.
 */
export function conferirPrestacao(d: DadosMontagem, ctx: ContextoConferencia): Pendencia[] {
  const p: Pendencia[] = [];
  const impede = (bloco: string | null, titulo: string) =>
    p.push({ bloco, titulo, severidade: 'IMPEDE' });
  const atencao = (bloco: string | null, titulo: string) =>
    p.push({ bloco, titulo, severidade: 'ATENCAO' });

  /*
   * 1. A prestação está oca?
   *
   * Estes cinco são a substância do documento. Nenhum deles vazio é situação
   * normal numa prestação que se vai transmitir — e todos passam no schema.
   */
  if (!d.documentosFiscais.length) impede('documentosFiscais', 'Nenhum documento fiscal lançado.');
  if (!d.pagamentos.length) impede('pagamentos', 'Nenhum pagamento lançado.');
  if (!d.receitas.length) impede('receitas', 'Nenhuma receita ou repasse lançado.');
  if (!d.disponibilidades.length)
    impede('disponibilidades', 'Nenhuma disponibilidade informada — falta o saldo das contas.');

  /*
   * O empenho só é cobrado de quem empenha.
   *
   * A marca é do órgão: há concessores cujo repasse não passa por empenho
   * próprio. Cobrar de todos transformaria a pendência em ruído para uma
   * parte dos clientes — e ruído é o que faz o painel deixar de ser lido.
   */
  if (ctx.orgaoEmpenha && !d.empenhos.length) impede('empenhos', 'Nenhum empenho lançado.');

  /*
   * 2. A despesa está dentro do Plano de Aplicação?
   *
   * A regra já barra no momento de apropriar a nota, mas a barreira é daquele
   * instante: o plano pode ter sido alterado depois, e notas apropriadas antes
   * de a regra existir nunca passaram por ela. Aqui a conferência é refeita
   * sobre o que está de fato na prestação.
   */
  if (ctx.categoriasDoPlano.length) {
    const fora = new Set(
      d.documentosFiscais
        .filter((f) => !ctx.categoriasDoPlano.includes(f.categoriaDespesaTipo))
        .map((f) => f.categoriaDespesaTipo),
    );
    const notas = d.documentosFiscais.filter(
      (f) => !ctx.categoriasDoPlano.includes(f.categoriaDespesaTipo),
    ).length;
    if (notas)
      impede(
        'documentosFiscais',
        `${notas} documento(s) fiscal(is) com categoria de despesa fora do Plano de Aplicação ` +
          `(categoria${fora.size > 1 ? 's' : ''} ${[...fora].sort((a, b) => a - b).join(', ')}).`,
      );
  } else if (d.documentosFiscais.length) {
    // Sem plano não há o que conferir — e é a conferência que garante que a
    // entidade só executou o que foi pactuado. Vale o aviso, não o bloqueio:
    // ajuste antigo pode legitimamente não ter o plano digitado aqui.
    atencao(
      null,
      'O ajuste não tem Plano de Aplicação cadastrado — não há como conferir se as despesas estavam previstas.',
    );
  }

  /*
   * 3. As metas foram aferidas?
   *
   * Só perguntamos quando o ajuste **tem** metas: relatório de atividades
   * vazio num ajuste sem metas cadastradas não é pendência, é coerência.
   */
  if (ctx.metasPrevistas > 0) {
    const faltam = ctx.metasPrevistas - d.atividades.length;
    if (faltam > 0)
      atencao(
        'atividades',
        `${faltam} de ${ctx.metasPrevistas} meta(s) ainda sem aferição no relatório de atividades.`,
      );
    const semResultado = d.atividades.filter((a) => a.metaAtendida == null).length;
    if (semResultado)
      atencao(
        'atividades',
        `${semResultado} meta(s) aferida(s) sem dizer se foi atingida.`,
      );
  }

  /*
   * 4. Os documentos estão lá?
   *
   * O anexo **não vai no envio** — o TCESP recebe os dados, não os PDFs —, e
   * por isso faltar um nunca impede a transmissão. Mas é a primeira coisa que
   * a fiscalização pede ao analisar, e até aqui a resposta morava numa pasta de
   * rede. Agora que a despesa guarda os arquivos, a prestação sabe dizer quais
   * faltam **antes** de alguém perguntar.
   *
   * Basta **um** arquivo para a nota não ser apontada, qualquer que seja o
   * papel dele: exigir justamente o "Documento Fiscal" apontaria a nota de
   * autônomo que tem o recibo anexado — e cobrar o que já está lá é o caminho
   * mais curto para o painel deixar de ser lido.
   */
  if (ctx.notasSemAnexo > 0)
    atencao(
      'documentosFiscais',
      `${ctx.notasSemAnexo} documento(s) fiscal(is) sem nenhum arquivo anexado.`,
    );

  if (ctx.pagamentosSemComprovante > 0)
    atencao(
      'pagamentos',
      `${ctx.pagamentosSemComprovante} pagamento(s) sem comprovante anexado.`,
    );

  /*
   * 5. Coerências que ninguém confere à mão.
   *
   * Nenhuma delas é irregular por si — por isso são avisos. O que elas fazem é
   * pôr diante dos olhos um número que, sozinho numa tela, ninguém compara.
   */
  const soma = (xs: Array<{ valor: number }>) => xs.reduce((s, x) => s + x.valor, 0);
  const recebido = soma(d.receitas);
  const pago = soma(d.pagamentos);
  if (pago > recebido)
    atencao(
      'pagamentos',
      `Os pagamentos (${brl(pago)}) somam mais que as receitas (${brl(recebido)}).`,
    );

  const divergentes = d.disponibilidades.filter(
    (x) => Math.abs(x.saldoBancario - x.saldoContabil) >= 0.01,
  ).length;
  if (divergentes)
    atencao(
      'disponibilidades',
      `${divergentes} conta(s) com saldo bancário diferente do contábil — confira a conciliação.`,
    );

  return p;
}

/** Só para a mensagem — o valor já vem somado em reais. */
function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
