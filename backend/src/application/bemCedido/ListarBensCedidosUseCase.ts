import type { BemCedido } from '@/core/bemCedido/BemCedido';
import type { IBemCedidoRepository } from './IBemCedidoRepository';
import type { FiltrosBemCedido, Paginado } from './dtos';

const PAGE_SIZE_PADRAO = 10;
const PAGE_SIZE_MAX = 100;
const CAMPOS_ORDENAVEIS = ['descricao', 'tipo', 'identificador', 'valor', 'dataCessao', 'ativo', 'criadoEm'];

export class ListarBensCedidosUseCase {
  constructor(private readonly repo: IBemCedidoRepository) {}

  async execute(params: {
    filtros?: FiltrosBemCedido;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<BemCedido>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosBemCedido = {};
    if (entrada.descricao?.trim()) filtros.descricao = entrada.descricao.trim();
    if (entrada.tipo?.trim()) filtros.tipo = entrada.tipo.trim();
    if (entrada.identificador?.trim()) filtros.identificador = entrada.identificador.trim();
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
