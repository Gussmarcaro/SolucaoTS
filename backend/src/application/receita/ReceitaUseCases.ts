import type { Receita } from '@/core/receita/Receita';
import type { IReceitaRepository } from './IReceitaRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosReceita, ReceitaDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import type { IContaBancariaRepository } from '@/application/contaBancaria/IContaBancariaRepository';

/**
 * Tipos aceitos.
 *
 * As três esferas de aplicação financeira são o que o montador espera (o schema
 * separa municipais, estaduais e federais). `APLIC_FINANCEIRA`, sem esfera,
 * continua na lista só por causa dos registros gravados antes dessa separação —
 * o montador os soma em "municipais" e avisa para reclassificar. Sem ele aqui,
 * editar uma receita antiga passaria a ser impossível.
 */
const TIPOS = [
  'REPASSE_RECEBIDO',
  'APLIC_FINANC_MUNICIPAL',
  'APLIC_FINANC_ESTADUAL',
  'APLIC_FINANC_FEDERAL',
  'APLIC_FINANCEIRA',
  'OUTRA',
  'RECURSO_PROPRIO',
];

/** Número opcional; string vazia e nulo viram `null`. */
function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function dataOpcional(v: string | null | undefined, campo: string): Date | null {
  if (!v) return null;
  try {
    return parseDataISO(v);
  } catch {
    throw new BusinessError(`${campo} inválida.`);
  }
}

function validar(input: ReceitaDTO): DadosReceita {
  const tipo = input.tipo?.trim() ?? '';
  if (!TIPOS.includes(tipo)) throw new BusinessError('Tipo de receita inválido.');

  const valor = typeof input.valor === 'string' ? Number(input.valor) : input.valor;
  if (!Number.isFinite(valor) || valor === 0) throw new BusinessError('Valor da receita inválido.');

  const fonte =
    input.fonteRecursoTipo === undefined || input.fonteRecursoTipo === null || input.fonteRecursoTipo === ''
      ? null
      : Number(input.fonteRecursoTipo);
  if (fonte !== null && (!Number.isFinite(fonte) || fonte <= 0))
    throw new BusinessError('Fonte de recurso inválida.');

  // Identificação bancária: **controle interno**, todos opcionais.
  //
  // Diferente de Pagamento, aqui nada é obrigatório — estes campos não vão ao
  // TCESP (o bloco "receitas" não os tem), então exigi-los seria barrar um
  // lançamento válido por causa de um dado que o Tribunal nunca vai ver.
  const banco = num(input.banco);
  if (banco !== null && banco <= 0) throw new BusinessError('Banco inválido.');
  const agencia = num(input.agencia);
  if (agencia !== null && agencia <= 0) throw new BusinessError('Agência inválida.');

  return {
    ajusteId: input.ajusteId?.trim() || null,
    contaBancariaId: input.contaBancariaId?.trim() || null,
    tipo,
    descricao: input.descricao?.trim() || null,
    dataPrevista: dataOpcional(input.dataPrevista, 'Data prevista'),
    dataRepasse: dataOpcional(input.dataRepasse, 'Data do repasse'),
    fonteRecursoTipo: fonte,
    valor,
    banco,
    agencia,
    contaCorrente: input.contaCorrente?.trim() || null,
    numeroTransacao: input.numeroTransacao?.trim() || null,
  };
}

export class ReceitaUseCases {
  constructor(
    private readonly repo: IReceitaRepository,
    private readonly prestacoes: IPrestacaoRepository,
    private readonly contas: IContaBancariaRepository,
  ) {}

  /**
   * A conta bancária decide a fonte de recurso — e os dados bancários.
   *
   * **Por que isto deixou de ser digitado.** A conta do cadastro já sabe de
   * qual fonte ela recebe (`ContaBancaria.fonteRecursoTipo`), então perguntar
   * as duas coisas no mesmo formulário era pedir ao usuário que repetisse o que
   * o sistema tinha — e abrir a chance de responder diferente. Escolhida a
   * conta, a fonte vem junto.
   *
   * **E fecha um furo de rejeição.** `fonte_recurso_tipo` é **obrigatório** em
   * `repasses_recebidos` no schema v1.14, e o `limpo()` do montador remove
   * nulos: um repasse sem fonte simplesmente sumia do JSON e o documento voltava
   * rejeitado. Nada acusava antes de transmitir.
   *
   * Os dados bancários são copiados como **fotografia**, não lidos pela relação:
   * editar a conta amanhã não pode reescrever um lançamento já feito.
   */
  private async resolverConta(dados: DadosReceita, atual?: Receita): Promise<DadosReceita> {
    if (!dados.contaBancariaId) {
      /*
       * Sem conta escolhida, **preserva** a fonte que o lançamento já tinha.
       *
       * O formulário não mostra mais o campo, então editar a descrição de um
       * lançamento antigo enviaria fonte nula — e apagaria em silêncio um dado
       * que o Tribunal exige. Edição não pode destruir o que ela não mostra.
       */
      return atual ? { ...dados, fonteRecursoTipo: dados.fonteRecursoTipo ?? atual.fonteRecursoTipo } : dados;
    }

    const conta = await this.contas.buscarPorId(dados.contaBancariaId);
    // A extension de tenant já recortou: conta de outro órgão "não existe".
    if (!conta) throw new NotFoundError('Conta bancária não encontrada.');
    if (conta.fonteRecursoTipo == null)
      throw new BusinessError(
        'A conta bancária escolhida está sem fonte de recurso. Informe-a em Execução → Financeiro → Contas Bancárias.',
      );

    return {
      ...dados,
      fonteRecursoTipo: conta.fonteRecursoTipo,
      banco: conta.banco,
      // A agência é texto no cadastro (aceita zero à esquerda) e número aqui.
      // A perda do zero não machuca: este campo é controle interno e não é
      // transmitido — quem leva agência ao TCESP é o bloco `repasses`.
      agencia: Number(conta.agencia.replace(/\D/g, '')) || null,
      contaCorrente: conta.conta,
    };
  }

  /**
   * Repasse recebido **exige** fonte de recurso.
   *
   * É a regra que o schema oficial impõe e que ninguém via: sem ela o repasse
   * some do documento. Vale só para `REPASSE_RECEBIDO` — nos outros tipos o
   * bloco `receitas` transmite apenas descrição e valor, e exigir fonte ali
   * barraria lançamento válido por um dado que o Tribunal nunca vê.
   */
  private exigirFonte(dados: DadosReceita) {
    if (dados.tipo === 'REPASSE_RECEBIDO' && dados.fonteRecursoTipo == null)
      throw new BusinessError(
        'Informe a fonte de recurso do repasse — ela vem da conta bancária, e é obrigatória no envio ao TCESP.',
      );
    return dados;
  }

  private async preparar(input: ReceitaDTO, atual?: Receita): Promise<DadosReceita> {
    return this.exigirFonte(await this.resolverConta(validar(input), atual));
  }

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Receita> {
    const r = await this.repo.buscarPorId(id);
    if (!r || r.prestacaoId !== prestacaoId) throw new NotFoundError('Receita não encontrada.');
    return r;
  }


  // ---------------------------------------------------------------------------
  // Escopo do órgão — Execução → Financeiro
  //
  // O lançamento acontece aqui, quando o dinheiro entra ou sai, e não dentro de
  // uma prestação. A prestação depois **escolhe** quais lançamentos do período
  // entram nela — seleção explícita, não automática.
  // ---------------------------------------------------------------------------

  async listarDoOrgao(): Promise<Receita[]> {
    return this.repo.listarDoOrgao();
  }

  async criarNoOrgao(input: ReceitaDTO): Promise<Receita> {
    return this.repo.criarNoOrgao(await this.preparar(input));
  }

  async atualizarNoOrgao(id: string, input: ReceitaDTO): Promise<Receita> {
    const atual = await this.garantirDoOrgao(id);
    return this.repo.atualizar(id, await this.preparar(input, atual));
  }

  async excluirDoOrgao(id: string): Promise<void> {
    await this.garantirDoOrgao(id);
    await this.repo.excluir(id);
  }

  /**
   * O lançamento existe e é deste órgão?
   *
   * A conferência é a própria busca: a extension de tenant já recorta, então um
   * registro de outro órgão simplesmente "não existe" — que é também a resposta
   * certa do ponto de vista de não revelar o que há do outro lado.
   */
  private async garantirDoOrgao(id: string) {
    const r = await this.repo.buscarPorId(id);
    if (!r) throw new NotFoundError('Receita não encontrada.');
    return r;
  }


  // ---------------------------------------------------------------------------
  // Apropriação — a prestação escolhe quais lançamentos do órgão entram nela
  // ---------------------------------------------------------------------------

  /** Os candidatos: do ajuste desta prestação, no exercício, ainda livres. */
  async listarCandidatos(prestacaoId: string) {
    const prestacao = await this.prestacoes.buscarPorId(prestacaoId);
    if (!prestacao) throw new NotFoundError('Prestação não encontrada.');
    return this.repo.listarCandidatos(prestacao.ajusteId, prestacao.ano);
  }

  /**
   * Inclui na prestação.
   *
   * Recusa o que já pertence a **outra** prestação: o mesmo dinheiro em duas
   * prestações é o erro que esta tela existe para impedir, e ele não se
   * descobre olhando — some no meio de centenas de linhas.
   */
  async apropriar(prestacaoId: string, id: string) {
    const prestacao = await this.prestacoes.buscarPorId(prestacaoId);
    if (!prestacao) throw new NotFoundError('Prestação não encontrada.');

    const item = await this.repo.buscarPorId(id);
    if (!item) throw new NotFoundError('Lançamento não encontrado.');
    if (item.prestacaoId && item.prestacaoId !== prestacaoId)
      throw new BusinessError('Este lançamento já pertence a outra prestação de contas.');
    if (item.ajusteId && item.ajusteId !== prestacao.ajusteId)
      throw new BusinessError('Este lançamento é de outro ajuste.');

    await this.repo.apropriar(id, prestacaoId, prestacao.ajusteId);
  }

  async desapropriar(prestacaoId: string, id: string) {
    const item = await this.repo.buscarPorId(id);
    if (!item || item.prestacaoId !== prestacaoId)
      throw new NotFoundError('Lançamento não encontrado nesta prestação.');
    await this.repo.desapropriar(id);
  }

  async listar(prestacaoId: string): Promise<Receita[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: ReceitaDTO): Promise<Receita> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.criar(prestacaoId, await this.preparar(input));
  }

  async atualizar(prestacaoId: string, id: string, input: ReceitaDTO): Promise<Receita> {
    const atual = await this.garantirNaPrestacao(prestacaoId, id);
    return this.repo.atualizar(id, await this.preparar(input, atual));
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}
