import type { BemPrestacao, CategoriaBem } from '@/core/bemPrestacao/BemPrestacao';
import type { IBemPrestacaoRepository } from './IBemPrestacaoRepository';
import type { IPrestacaoRepository } from '@/application/prestacao/IPrestacaoRepository';
import type { BemPrestacaoDTO, DadosBemPrestacao } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

const CATEGORIAS: CategoriaBem[] = [
  'MOVEL_ADQUIRIDO',
  'MOVEL_CEDIDO',
  'MOVEL_BAIXADO',
  'IMOVEL_ADQUIRIDO',
  'IMOVEL_CEDIDO',
  'IMOVEL_BAIXADO',
];

function validar(input: BemPrestacaoDTO): DadosBemPrestacao {
  const categoria = input.categoria;
  if (!CATEGORIAS.includes(categoria)) throw new BusinessError('Categoria do bem inválida.');

  const descricao = input.descricao?.trim() ?? '';
  if (!descricao) throw new BusinessError('Informe a descrição do bem.');

  let data: Date;
  try {
    data = parseDataISO(input.data);
  } catch {
    throw new BusinessError('Data inválida.');
  }

  const ehMovel = categoria.startsWith('MOVEL');
  const numeroPatrimonio = ehMovel ? input.numeroPatrimonio?.trim() || null : null;
  if (ehMovel && !numeroPatrimonio)
    throw new BusinessError('Informe o número de patrimônio do bem móvel.');

  const exigeValor = categoria === 'MOVEL_ADQUIRIDO' || categoria === 'MOVEL_CEDIDO';
  let valor: number | null = null;
  if (exigeValor) {
    const v = input.valor == null || input.valor === '' ? null : Number(input.valor);
    if (v == null || !Number.isFinite(v) || v <= 0)
      throw new BusinessError(
        categoria === 'MOVEL_CEDIDO'
          ? 'O valor da cessão é obrigatório para bens móveis cedidos.'
          : 'Informe o valor de aquisição do bem móvel.',
      );
    valor = v;
  }

  return { categoria, numeroPatrimonio, descricao, data, valor };
}

export class BemPrestacaoUseCases {
  constructor(
    private readonly repo: IBemPrestacaoRepository,
    private readonly prestacoes: IPrestacaoRepository,
  ) {}

  private async garantirPrestacao(prestacaoId: string) {
    if (!(await this.prestacoes.buscarPorId(prestacaoId)))
      throw new NotFoundError('Prestação não encontrada.');
  }

  private async garantirNaPrestacao(prestacaoId: string, id: string): Promise<BemPrestacao> {
    const b = await this.repo.buscarPorId(id);
    if (!b || b.prestacaoId !== prestacaoId) throw new NotFoundError('Bem não encontrado.');
    return b;
  }

  async listar(prestacaoId: string): Promise<BemPrestacao[]> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.listarPorPrestacao(prestacaoId);
  }

  async criar(prestacaoId: string, input: BemPrestacaoDTO): Promise<BemPrestacao> {
    await this.garantirPrestacao(prestacaoId);
    return this.repo.criar(prestacaoId, validar(input));
  }

  async atualizar(prestacaoId: string, id: string, input: BemPrestacaoDTO): Promise<BemPrestacao> {
    await this.garantirNaPrestacao(prestacaoId, id);
    return this.repo.atualizar(id, validar(input));
  }

  async excluir(prestacaoId: string, id: string): Promise<void> {
    await this.garantirNaPrestacao(prestacaoId, id);
    await this.repo.excluir(id);
  }
}
