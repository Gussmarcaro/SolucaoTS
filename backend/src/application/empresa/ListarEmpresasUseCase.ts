import type { Empresa } from '@/core/empresa/Empresa';
import type { IEmpresaRepository } from './IEmpresaRepository';
import type { FiltrosEmpresa, Paginado } from './dtos';

import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';

/** Campos permitidos para ordenação. */
const CAMPOS_ORDENAVEIS = ['razaoSocial', 'nomeFantasia', 'cnpj', 'cidade', 'uf', 'ativo', 'criadoEm'];

export class ListarEmpresasUseCase {
  constructor(private readonly repo: IEmpresaRepository) {}

  async execute(params: {
    filtros?: FiltrosEmpresa;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Empresa>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosEmpresa = {};
    if (entrada.razaoSocial?.trim()) filtros.razaoSocial = entrada.razaoSocial.trim();
    if (entrada.nomeFantasia?.trim()) filtros.nomeFantasia = entrada.nomeFantasia.trim();
    if (entrada.cnpj?.trim()) filtros.cnpj = entrada.cnpj.trim();
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
