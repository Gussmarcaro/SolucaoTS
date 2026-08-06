import type { ServidorCedido } from '@/core/servidorCedido/ServidorCedido';
import type { IServidorCedidoRepository } from './IServidorCedidoRepository';
import type { FiltrosServidorCedido, Paginado } from './dtos';

const PAGE_SIZE_PADRAO = 10;
const PAGE_SIZE_MAX = 100;
const CAMPOS_ORDENAVEIS = [
  'nome',
  'cpf',
  'cargoPublico',
  'remuneracaoBruta',
  'dataInicialCessao',
  'ativo',
  'criadoEm',
];

export class ListarServidoresCedidosUseCase {
  constructor(private readonly repo: IServidorCedidoRepository) {}

  async execute(params: {
    filtros?: FiltrosServidorCedido;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<ServidorCedido>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const entrada = params.filtros ?? {};
    const filtros: FiltrosServidorCedido = {};
    if (entrada.nome?.trim()) filtros.nome = entrada.nome.trim();
    if (entrada.cpf?.trim()) filtros.cpf = entrada.cpf.trim();
    if (entrada.cargoPublico?.trim()) filtros.cargoPublico = entrada.cargoPublico.trim();
    if (entrada.onusPagamento?.trim()) filtros.onusPagamento = entrada.onusPagamento.trim();
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
