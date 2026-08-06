export type TipoDocumento = 'CPF' | 'CNPJ';

export interface Contrato {
  id: string;
  numero: string;
  credorNome: string;
  credorDocumento: string;
  credorDocumentoTipo: TipoDocumento;
  naturezaContratacao: string;
  objeto: string;
  dataAssinatura: string; // 'YYYY-MM-DD'
  vigenciaInicio: string; // 'YYYY-MM-DD'
  vigenciaFim: string | null;
  valorMontante: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ContratoPayload {
  numero: string;
  credorNome: string;
  credorDocumento: string;
  credorDocumentoTipo: TipoDocumento;
  naturezaContratacao: string;
  objeto: string;
  dataAssinatura: string;
  vigenciaInicio: string;
  vigenciaFim?: string | null;
  valorMontante: number;
}

export interface FiltrosContrato {
  numero?: string;
  credorNome?: string;
  credorDocumento?: string;
  naturezaContratacao?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
