import type { Prestacao } from '@/core/prestacao/Prestacao';
import type { IPrestacaoRepository } from './IPrestacaoRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { CriarPrestacaoDTO, FiltrosPrestacao, Paginado } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';

import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';
const CAMPOS_ORDENAVEIS = ['ano', 'status', 'criadoEm'];
const MES_ANUAL = 12; // prestação anual consolidada (descritor mes = 12)

export class PrestacaoUseCases {
  constructor(
    private readonly repo: IPrestacaoRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  async criar(input: CriarPrestacaoDTO): Promise<Prestacao> {
    const ajusteId = input.ajusteId?.trim() ?? '';
    if (!ajusteId) throw new BusinessError('Selecione o ajuste.');

    const ajuste = await this.ajustes.buscarPorId(ajusteId);
    if (!ajuste) throw new NotFoundError('Ajuste não encontrado.');

    const ano = typeof input.ano === 'string' ? Number(input.ano) : input.ano;
    const anoCorrente = new Date().getUTCFullYear();
    if (!Number.isInteger(ano) || ano < 2025 || ano > anoCorrente)
      throw new BusinessError(`Exercício inválido. Informe um ano entre 2025 e ${anoCorrente}.`);

    const existente = await this.repo.buscarPorAjusteAno(ajusteId, ano);
    if (existente)
      throw new ConflictError(
        `Já existe uma prestação para este ajuste no exercício ${ano}.`,
        'PRESTACAO_DUPLICADA',
      );

    return this.repo.criar({
      ajusteId,
      tipoDocumento: ajuste.tipoAjuste,
      ano,
      mes: MES_ANUAL,
      ehRetificacao: !!input.ehRetificacao,
    });
  }

  async buscar(id: string): Promise<Prestacao> {
    const p = await this.repo.buscarPorId(id);
    if (!p) throw new NotFoundError('Prestação não encontrada.');
    return p;
  }

  async excluir(id: string): Promise<void> {
    const p = await this.buscar(id);
    if (p.status !== 'EM_ELABORACAO')
      throw new BusinessError('Só é possível excluir prestações em elaboração.');
    await this.repo.excluir(id);
  }

  async listar(params: {
    filtros?: FiltrosPrestacao;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Prestacao>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosPrestacao = {};
    if (entrada.status?.trim()) filtros.status = entrada.status.trim();
    if (entrada.ajusteId?.trim()) filtros.ajusteId = entrada.ajusteId.trim();
    if (Number.isInteger(entrada.ano)) filtros.ano = entrada.ano;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'asc' ? ('asc' as const) : ('desc' as const) }
      : undefined;

    return this.repo.listar({ filtros, busca: params.busca?.trim() || undefined, ordem, page, pageSize });
  }
}
