import type { Cliente } from '@/core/cliente/Cliente';
import type { IClienteRepository } from './IClienteRepository';
import type { FiltrosCliente, Paginado } from './dtos';

import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';
const CAMPOS_ORDENAVEIS = ['nome', 'cnpj', 'codigoMunicipio', 'codigoEntidade', 'tipoOrgao', 'ativo', 'criadoEm'];

export class ListarClientesUseCase {
  constructor(private readonly repo: IClienteRepository) {}

  async execute(params: {
    filtros?: FiltrosCliente;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Cliente>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosCliente = {};
    if (entrada.nome?.trim()) filtros.nome = entrada.nome.trim();
    if (entrada.cnpj?.trim()) filtros.cnpj = entrada.cnpj.trim();
    if (entrada.tipoOrgao?.trim()) filtros.tipoOrgao = entrada.tipoOrgao.trim();
    if (entrada.periodicidade?.trim()) filtros.periodicidade = entrada.periodicidade.trim();
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
