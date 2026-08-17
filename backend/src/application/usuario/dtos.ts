/** Entrada do cadastro (inclui senha + confirmação, usadas para login). */
export interface CriarUsuarioDTO {
  nome: string;
  documento: string;
  grupoUsuarioId?: string | null;
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senha: string;
  confirmarSenha: string;
}

/** Entrada da edição — senha é opcional (só troca se informada). */
export interface AtualizarUsuarioDTO {
  nome: string;
  documento: string;
  grupoUsuarioId?: string | null;
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senha?: string;
  confirmarSenha?: string;
}

/** Dados já prontos para persistência (senha convertida em hash). */
export interface NovoUsuarioDTO {
  nome: string;
  documento: string;
  grupoUsuarioId: string | null;
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
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
  /** Nome do grupo de acesso — vai para o token e decide o que o usuário vê. */
  grupoNome: string | null;
  /** Órgão do usuário — vai para o token e isola os dados que ele alcança. */
  clienteId: string | null;
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
  ativo?: boolean;
}

export interface ListarUsuariosParams {
  filtros: FiltrosUsuario;
  /** Busca global — casa com qualquer campo da grade (OR). */
  busca?: string;
  /** Ordenação (campo já validado contra whitelist). */
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
