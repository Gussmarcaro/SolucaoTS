import type { EntidadeBeneficiaria } from '@/core/entidade/EntidadeBeneficiaria';
import type { IEntidadeRepository } from './IEntidadeRepository';
import type { FiltrosEntidade, Paginado } from './dtos';

const PAGE_SIZE_PADRAO = 10;
const PAGE_SIZE_MAX = 100;
const CAMPOS_ORDENAVEIS = ['razaoSocial', 'nomeFantasia', 'cnpj', 'cidade', 'uf', 'ativo', 'criadoEm'];

export class ListarEntidadesUseCase {
  constructor(private readonly repo: IEntidadeRepository) {}

  async execute(params: {
    filtros?: FiltrosEntidade;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<EntidadeBeneficiaria>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosEntidade = {};
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
