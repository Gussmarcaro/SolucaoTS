export type TipoDocumento = 'CPF' | 'CNPJ';

/** Entidade de domínio — representa um usuário cadastrado. */
export interface Usuario {
  id: string;
  clienteId: string | null;
  nome: string;
  documento: string; // apenas dígitos
  documentoTipo: TipoDocumento;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  celular: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
