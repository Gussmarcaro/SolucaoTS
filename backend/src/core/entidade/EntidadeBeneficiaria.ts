/** Entidade de domínio — Entidade Beneficiária (OSC que recebe o repasse). */
export interface EntidadeBeneficiaria {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string; // apenas dígitos
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  dataConstituicao: Date | null;
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
