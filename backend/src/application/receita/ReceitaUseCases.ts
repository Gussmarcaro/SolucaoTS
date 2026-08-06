import type { Receita } from '@/core/receita/Receita';
import type { IReceitaRepository } from './IReceitaRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { DadosReceita, ReceitaDTO } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

const TIPOS = ['REPASSE_RECEBIDO', 'APLIC_FINANCEIRA', 'OUTRA', 'RECURSO_PROPRIO'];

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

  return {
    tipo,
    descricao: input.descricao?.trim() || null,
    dataPrevista: dataOpcional(input.dataPrevista, 'Data prevista'),
    dataRepasse: dataOpcional(input.dataRepasse, 'Data do repasse'),
    fonteRecursoTipo: fonte,
    valor,
  };
}

export class ReceitaUseCases {
  constructor(
    private readonly repo: IReceitaRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<Receita> {
    const r = await this.repo.buscarPorId(id);
    if (!r || r.prestacaoId !== prestacaoId) throw new NotFoundError('Receita não encontrada.');
    return r;
  }

  async listar(prestacaoId: string): Promise<Receita[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: ReceitaDTO): Promise<Receita> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.criar(prestacaoId, validar(input));
  }

  async atualizar(prestacaoId: string, id: string, input: ReceitaDTO): Promise<Receita> {
    await this.garantirNaPrestacao(prestacaoId, id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}
