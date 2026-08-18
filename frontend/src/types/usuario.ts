export interface Usuario {
  id: string;
  clienteId: string | null;
  /** Nome do órgão a que o usuário pertence — o id não diz nada a ninguém. */
  orgaoNome: string | null;
  grupoUsuarioId: string | null;
  grupoNome: string | null;
  nome: string;
  documento: string; // CPF — usuário do sistema é sempre pessoa física
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarUsuarioPayload {
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

export type AtualizarUsuarioPayload = Omit<CriarUsuarioPayload, 'senha' | 'confirmarSenha'> & {
  senha?: string;
  confirmarSenha?: string;
};

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

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
