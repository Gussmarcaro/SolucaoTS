export type TipoDocumento = 'CPF' | 'CNPJ';

/** Entidade de domínio — Contrato firmado pela entidade beneficiária. */
export interface Contrato {
  id: string;
  numero: string;
  credorNome: string;
  credorDocumento: string; // apenas dígitos
  credorDocumentoTipo: TipoDocumento;
  naturezaContratacao: string;
  objeto: string;
  dataAssinatura: string; // 'YYYY-MM-DD'
  vigenciaInicio: string; // 'YYYY-MM-DD'
  vigenciaFim: string | null; // 'YYYY-MM-DD' (nulo = indeterminada)
  valorMontante: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
