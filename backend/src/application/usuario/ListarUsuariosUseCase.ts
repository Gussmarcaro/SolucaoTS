import type { Usuario } from '@/core/usuario/Usuario';
import type { IUsuarioRepository } from './IUsuarioRepository';
import type { FiltrosUsuario, ListarUsuariosParams, Paginado } from './dtos';

import { PAGE_SIZE_MAX, PAGE_SIZE_PADRAO } from '@/shared/paginacao';

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
    if (typeof params.filtros?.ativo === 'boolean') filtros.ativo = params.filtros.ativo;
    const busca = params.busca?.trim() || undefined;

    const campo =
      params.orderBy && CAMPOS_ORDENAVEIS.includes(params.orderBy) ? params.orderBy : undefined;
    const ordem = campo
      ? { campo, direcao: params.orderDir === 'asc' ? ('asc' as const) : ('desc' as const) }
      : undefined;

    const listarParams: ListarUsuariosParams = { filtros, busca, ordem, page, pageSize };
    return this.repo.listar(listarParams);
  }

  /** Remove filtros de texto vazios (o filtro booleano `ativo` é tratado à parte). */
  private limparFiltros(filtros: FiltrosUsuario): FiltrosUsuario {
    const limpo: FiltrosUsuario = {};
    for (const [chave, valor] of Object.entries(filtros)) {
      if (typeof valor === 'string' && valor.trim()) {
        (limpo as Record<string, string>)[chave] = valor.trim();
      }
    }
    return limpo;
  }
}
