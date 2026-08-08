/** Entidade de domínio — representa um usuário cadastrado (sempre pessoa física). */
export interface Usuario {
  id: string;
  clienteId: string | null;
  grupoUsuarioId: string | null;
  grupoNome: string | null; // nome do grupo (join p/ exibição)
  nome: string;
  documento: string; // CPF, apenas dígitos
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
  criadoEm: Date;
  atualizadoEm: Date;
}
