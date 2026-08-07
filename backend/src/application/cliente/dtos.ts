import type { TipoOrgao, Periodicidade } from '@prisma/client';

export interface CriarClienteDTO {
  nome: string;
  codigoMunicipio: number | string;
  codigoEntidade: number | string;
  tipoOrgao: string;
  periodicidade: string;
  cnpj: string;
}

export type AtualizarClienteDTO = CriarClienteDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosCliente {
  nome: string;
  codigoMunicipio: number;
  codigoEntidade: number;
  tipoOrgao: TipoOrgao;
  periodicidade: Periodicidade;
  cnpj: string;
}

export interface FiltrosCliente {
  nome?: string;
  cnpj?: string;
  tipoOrgao?: string;
  periodicidade?: string;
  ativo?: boolean;
}

export interface ListarClientesParams {
  filtros: FiltrosCliente;
  busca?: string;
  ordem?: { campo: string; direcao: 'asc' | 'desc' };
  page: number;
  pageSize: number;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
