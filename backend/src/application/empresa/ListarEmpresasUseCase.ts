import type { Empresa } from '@/core/empresa/Empresa';
import type { IEmpresaRepository } from './IEmpresaRepository';
import type { FiltrosEmpresa, Paginado } from './dtos';

const PAGE_SIZE_PADRAO = 10;
const PAGE_SIZE_MAX = 100;

export class ListarEmpresasUseCase {
  constructor(private readonly repo: IEmpresaRepository) {}

  async execute(params: {
    filtros?: FiltrosEmpresa;
    busca?: string;
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

    return this.repo.listar({ filtros, busca, page, pageSize });
  }
}
