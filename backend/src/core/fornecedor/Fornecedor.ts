export type TipoDocumento = 'CPF' | 'CNPJ';

/** Entidade de domínio — Fornecedor / Prestador (credor). */
export interface Fornecedor {
  id: string;
  nome: string;
  documento: string; // apenas dígitos
  documentoTipo: TipoDocumento;
  inscricaoEstadual: string | null;
  cep: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  telefoneFixo: string | null;
  whatsapp: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
