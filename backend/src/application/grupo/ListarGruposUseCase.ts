import type { Grupo } from '@/core/grupo/Grupo';
import type { IGrupoRepository } from './IGrupoRepository';
import type { FiltrosGrupo, Paginado } from './dtos';

import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';
const CAMPOS_ORDENAVEIS = ['nome', 'ativo', 'criadoEm'];

export class ListarGruposUseCase {
  constructor(private readonly repo: IGrupoRepository) {}

  async execute(params: {
    filtros?: FiltrosGrupo;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Grupo>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosGrupo = {};
    if (entrada.nome?.trim()) filtros.nome = entrada.nome.trim();
    if (typeof entrada.ativo === 'boolean') filtros.ativo = entrada.ativo;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'asc' ? ('asc' as const) : ('desc' as const) }
      : undefined;

    return this.repo.listar({ filtros, busca: params.busca?.trim() || undefined, ordem, page, pageSize });
  }
}
