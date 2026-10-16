import type { ContaBancaria } from '@/core/contaBancaria/ContaBancaria';
import type { IContaBancariaRepository } from './IContaBancariaRepository';
import type { ContaBancariaDTO, DadosContaBancaria } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { BANCO_CODIGOS, FONTE_RECURSO_CODIGOS } from '@/core/dominio/tabelasFaseV';
import { ajustesDaConta, type AjusteVinculado } from '@/core/contaBancaria/vinculos';

/** A conta do cadastro, com os ajustes que a declaram (quando pedidos). */
export type ContaComAjustes = ContaBancaria & { ajustes?: AjusteVinculado[] };

function validar(input: ContaBancariaDTO): DadosContaBancaria {
  const banco = Number(String(input.banco ?? '').replace(/\D/g, ''));
  if (!Number.isInteger(banco) || banco <= 0) throw new BusinessError('Informe o banco.');
  // Conferido contra a tabela oficial: código fora dela seria recusado no
  // envio da prestação, e o erro apareceria no Tribunal, não aqui.
  if (!BANCO_CODIGOS.has(banco)) throw new BusinessError(`Banco inexistente na tabela: ${banco}.`);

  /*
   * Agência como **texto**, não número.
   *
   * Agência tem dígito verificador e zero à esquerda ("0001-2"), e guardá-la
   * como número comeria os dois. É o mesmo motivo pelo qual a conta sempre foi
   * texto — e a diferença entre as duas no Ajuste (lá a agência é `Int`) é
   * dívida que este cadastro não repete.
   */
  const agencia = String(input.agencia ?? '').trim();
  if (!agencia) throw new BusinessError('Informe a agência.');

  const conta = String(input.conta ?? '').trim();
  if (!conta) throw new BusinessError('Informe o número da conta.');

  const tipo =
    input.contaTipo === undefined || input.contaTipo === null || input.contaTipo === ''
      ? null
      : Number(input.contaTipo);
  if (tipo !== null && (!Number.isInteger(tipo) || tipo <= 0))
    throw new BusinessError('Tipo de conta inválido.');

  /*
   * A fonte de recurso que entra na conta — **obrigatória**.
   *
   * É ela que o pagamento herda ao escolher a conta, e é campo exigido no
   * envio ao Audesp. Sem ela aqui, o operador teria de lembrar a fonte a cada
   * pagamento — e a fonte errada não é recusada no envio (o código existe na
   * tabela), então o erro só apareceria na análise do Tribunal.
   *
   * Exigida também nas contas antigas, na primeira edição: é a mesma decisão
   * tomada na fonte das contas do ajuste — não conviver com cadastro meio
   * preenchido, que ninguém volta para terminar.
   */
  const fonte =
    input.fonteRecursoTipo === undefined ||
    input.fonteRecursoTipo === null ||
    input.fonteRecursoTipo === ''
      ? null
      : Number(input.fonteRecursoTipo);
  if (fonte === null) throw new BusinessError('Informe a fonte de recurso que entra nesta conta.');
  if (!Number.isInteger(fonte) || !FONTE_RECURSO_CODIGOS.has(fonte))
    throw new BusinessError(`Fonte de recurso inexistente na tabela: ${input.fonteRecursoTipo}.`);

  return {
    banco,
    agencia,
    conta,
    contaTipo: tipo,
    fonteRecursoTipo: fonte,
    apelido: input.apelido?.trim() || null,
    observacao: input.observacao?.trim() || null,
  };
}

/**
 * Cadastro de contas bancárias do órgão.
 *
 * Antes, a mesma conta era digitada em três lugares — na lista do Ajuste, no
 * pagamento e no extrato importado. Três digitações do mesmo número é um dígito
 * trocado esperando para acontecer, e quando acontece o extrato simplesmente
 * deixa de casar, sem erro nenhum.
 */
export class ContaBancariaUseCases {
  constructor(private readonly repo: IContaBancariaRepository) {}

  /**
   * As contas do órgão. Com `comVinculos`, cada uma leva os ajustes que a
   * declaram.
   *
   * Os vínculos são **opcionais de propósito**: quem pede a lista é, na maioria
   * das vezes, um combo de escolha (Receita, Pagamento, Ajuste), e ali o nome
   * do ajuste não significa nada — seria peso em toda requisição para servir a
   * uma tela só. A grade do cadastro pede; o resto não.
   */
  async listar(
    apenasAtivas = false,
    ajusteId?: string,
    comVinculos = false,
  ): Promise<ContaComAjustes[]> {
    const contas = await this.repo.listar(apenasAtivas, ajusteId?.trim() || undefined);
    if (!comVinculos) return contas;

    const vinculos = await this.repo.listarVinculos();
    return contas.map((c) => ({ ...c, ajustes: ajustesDaConta(c, vinculos) }));
  }

  async criar(input: ContaBancariaDTO): Promise<ContaBancaria> {
    const dados = validar(input);
    await this.checarDuplicada(dados);
    return this.repo.criar(dados);
  }

  async atualizar(id: string, input: ContaBancariaDTO): Promise<ContaBancaria> {
    await this.garantir(id);
    const dados = validar(input);
    await this.checarDuplicada(dados, id);
    return this.repo.atualizar(id, dados);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<ContaBancaria> {
    await this.garantir(id);
    return this.repo.definirAtivo(id, ativo);
  }

  /**
   * Excluir só o que ninguém usa.
   *
   * Conta citada por um ajuste não pode sumir: o vínculo apontaria para o nada,
   * e o histórico deixaria de se explicar. O caminho nesse caso é **inativar** —
   * ela sai das listas de escolha e o passado continua legível.
   */
  async excluir(id: string): Promise<void> {
    const conta = await this.garantir(id);
    /*
     * "Está em uso?" é a **mesma** pergunta que a coluna da grade responde, e
     * por isso usa a mesma função.
     *
     * A versão anterior consultava só `contaBancariaId`, e isso deixava passar
     * exatamente as contas dos ajustes antigos — aquelas declaradas antes do
     * cadastro central existir, que se ligam pelos dígitos e não pelo id. A
     * grade diria "usada no convênio 01/2026" e a exclusão a apagaria assim
     * mesmo; o ajuste ficaria declarando uma conta que o cadastro não tem
     * mais, e ela sumiria das telas de Execução daquela parceria.
     */
    const ajustes = ajustesDaConta(conta, await this.repo.listarVinculos());
    if (ajustes.length)
      throw new BusinessError(
        `Esta conta está vinculada a ${ajustes.length === 1 ? 'um ajuste' : `${ajustes.length} ajustes`} ` +
          `(${ajustes.map((a) => a.codigo).join(', ')}). Para tirá-la de uso sem perder o ` +
          'histórico, inative-a.',
      );
    await this.repo.excluir(id);
  }

  private async checarDuplicada(dados: DadosContaBancaria, ignorarId?: string) {
    const dup = await this.repo.buscarDuplicada(dados);
    if (dup && dup.id !== ignorarId)
      throw new ConflictError(
        `Já existe a conta ${dados.conta} (agência ${dados.agencia}) com este tipo.`,
        'CONTA_DUPLICADA',
      );
  }

  /**
   * A conta existe e é deste órgão?
   *
   * A conferência é a própria busca: a extension de tenant já recorta, então
   * uma conta de outro órgão simplesmente "não existe".
   */
  private async garantir(id: string): Promise<ContaBancaria> {
    const c = await this.repo.buscarPorId(id);
    if (!c) throw new NotFoundError('Conta bancária não encontrada.');
    return c;
  }
}
