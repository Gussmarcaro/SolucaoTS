import type { ContaBancaria } from '@/core/contaBancaria/ContaBancaria';
import type { IContaBancariaRepository } from './IContaBancariaRepository';
import type { ContaBancariaDTO, DadosContaBancaria } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { BANCO_CODIGOS } from '@/core/dominio/tabelasFaseV';

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

  return {
    banco,
    agencia,
    conta,
    contaTipo: tipo,
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

  async listar(apenasAtivas = false): Promise<ContaBancaria[]> {
    return this.repo.listar(apenasAtivas);
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
    await this.garantir(id);
    if (await this.repo.emUso(id))
      throw new BusinessError(
        'Esta conta está vinculada a um ou mais ajustes. Para tirá-la de uso sem perder o ' +
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
