/** Entidade de domínio — Empresa / Contratante. */
export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string; // apenas dígitos
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
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
