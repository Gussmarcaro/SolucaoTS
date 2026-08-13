import type { Ajuste } from '@/core/ajuste/Ajuste';
import type { IAjusteRepository } from './IAjusteRepository';
import type { FiltrosAjuste, Paginado } from './dtos';

import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';
const CAMPOS_ORDENAVEIS = [
  'codigoAjuste',
  'tipoAjuste',
  'valorGlobal',
  'dataAssinatura',
  'status',
  'criadoEm',
];

export class ListarAjustesUseCase {
  constructor(private readonly repo: IAjusteRepository) {}

  async execute(params: {
    filtros?: FiltrosAjuste;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Ajuste>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosAjuste = {};
    if (entrada.codigoAjuste?.trim()) filtros.codigoAjuste = entrada.codigoAjuste.trim();
    if (entrada.tipoAjuste?.trim()) filtros.tipoAjuste = entrada.tipoAjuste.trim();
    if (entrada.status?.trim()) filtros.status = entrada.status.trim();
    if (entrada.entidadeBeneficiariaId?.trim())
      filtros.entidadeBeneficiariaId = entrada.entidadeBeneficiariaId.trim();

    const busca = params.busca?.trim() || undefined;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'asc' ? ('asc' as const) : ('desc' as const) }
      : undefined;

    return this.repo.listar({ filtros, busca, ordem, page, pageSize });
  }
}
