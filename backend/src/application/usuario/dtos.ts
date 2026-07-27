import type { TipoDocumento } from '@/core/usuario/Usuario';

/** Entrada do cadastro (inclui senha + confirmação, usadas para login). */
export interface CriarUsuarioDTO {
  nome: string;
  documento: string;
  documentoTipo: TipoDocumento;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senha: string;
  confirmarSenha: string;
}

/** Dados já prontos para persistência (senha convertida em hash). */
export interface NovoUsuarioDTO {
  nome: string;
  documento: string;
  documentoTipo: TipoDocumento;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senhaHash: string;
}

/** Credenciais + dados sensíveis para autenticação. */
export interface UsuarioAuth {
  id: string;
  nome: string;
  email: string;
  senhaHash: string | null;
  ativo: boolean;
}

/** Filtros de listagem — todos os campos são pesquisáveis. */
export interface FiltrosUsuario {
  nome?: string;
  documento?: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  email?: string;
  celular?: string;
}

export interface ListarUsuariosParams {
  filtros: FiltrosUsuario;
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
