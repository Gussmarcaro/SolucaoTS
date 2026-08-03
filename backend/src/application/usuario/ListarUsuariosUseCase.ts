import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import type { FiltrosUsuario, ListarUsuariosParams, Paginado } from './dtos';

const PAGE_SIZE_PADRAO = 10;
const PAGE_SIZE_MAX = 100;

/** Campos permitidos para ordenação (evita ordenar por coluna arbitrária). */
const CAMPOS_ORDENAVEIS = [
  'nome', 'documento', 'email', 'celular', 'logradouro',
  'bairro', 'cidade', 'cep', 'uf', 'criadoEm',
];

export class ListarUsuariosUseCase {
  constructor(private readonly repo: IUsuarioRepository) {}

  async execute(params: {
    filtros?: FiltrosUsuario;
    busca?: string;
    orderBy?: string;
    orderDir?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginado<Usuario>> {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE_PADRAO)),
    );

    const filtros = this.limparFiltros(params.filtros ?? {});
    const busca = params.busca?.trim() || undefined;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'asc' ? ('asc' as const) : ('desc' as const) }
      : undefined;

    const listarParams: ListarUsuariosParams = { filtros, busca, ordem, page, pageSize };
    return this.repo.listar(listarParams);
  }

  /** Remove filtros vazios e normaliza. */
  private limparFiltros(filtros: FiltrosUsuario): FiltrosUsuario {
    const limpo: FiltrosUsuario = {};
    for (const [chave, valor] of Object.entries(filtros)) {
      const v = typeof valor === 'string' ? valor.trim() : valor;
      if (v) limpo[chave as keyof FiltrosUsuario] = v as string;
    }
    return limpo;
  }
}
