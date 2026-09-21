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
  /**
   * Quando a foto mudou pela última vez; `null` quando não há foto.
   *
   * É o que permite mostrar o avatar certo **sem** pedir a imagem — e o que
   * invalida o cache quando a foto é trocada.
   */
  fotoVersao: string | null;
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

/**
 * Edição do próprio cadastro. Sem `grupoUsuarioId`: o servidor o preserva do
 * registro, e enviá-lo daqui só sugeriria um poder que a tela não tem.
 */
export interface AtualizarPerfilPayload {
  nome: string;
  documento: string;
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  senhaAtual?: string;
  novaSenha?: string;
  confirmarSenha?: string;
}
