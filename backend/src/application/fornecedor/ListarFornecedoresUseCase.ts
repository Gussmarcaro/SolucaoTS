import type { Fornecedor } from '@/core/fornecedor/Fornecedor';
import type { IFornecedorRepository } from './IFornecedorRepository';
import type { FiltrosFornecedor, Paginado } from './dtos';

import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';
const CAMPOS_ORDENAVEIS = ['nome', 'documento', 'cidade', 'uf', 'ativo', 'criadoEm'];

export class ListarFornecedoresUseCase {
  constructor(private readonly repo: IFornecedorRepository) {}

  async execute(params: {
    filtros?: FiltrosFornecedor;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Fornecedor>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosFornecedor = {};
    if (entrada.nome?.trim()) filtros.nome = entrada.nome.trim();
    if (entrada.documento?.trim()) filtros.documento = entrada.documento.trim();
    if (entrada.cidade?.trim()) filtros.cidade = entrada.cidade.trim();
    if (entrada.uf?.trim()) filtros.uf = entrada.uf.trim();
    if (typeof entrada.ativo === 'boolean') filtros.ativo = entrada.ativo;

    const busca = params.busca?.trim() || undefined;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'asc' ? ('asc' as const) : ('desc' as const) }
      : undefined;

    return this.repo.listar({ filtros, busca, ordem, page, pageSize });
  }
}
