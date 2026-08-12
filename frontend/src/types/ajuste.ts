export type TipoAjuste =
  | 'CONTRATO_GESTAO'
  | 'CONVENIO'
  | 'TERMO_COLABORACAO'
  | 'TERMO_FOMENTO'
  | 'TERMO_PARCERIA';

export type Periodicidade = 'ANUAL' | 'QUADRIMESTRAL';
export type StatusAjuste = 'EM_ELABORACAO' | 'ENVIADO';

export const TIPO_AJUSTE_LABEL: Record<TipoAjuste, string> = {
  CONTRATO_GESTAO: 'Contrato de Gestão',
  CONVENIO: 'Convênio',
  TERMO_COLABORACAO: 'Termo de Colaboração',
  TERMO_FOMENTO: 'Termo de Fomento',
  TERMO_PARCERIA: 'Termo de Parceria',
};

export const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  ANUAL: 'Anual',
  QUADRIMESTRAL: 'Quadrimestral',
};

export const STATUS_AJUSTE_LABEL: Record<StatusAjuste, string> = {
  EM_ELABORACAO: 'Em elaboração',
  ENVIADO: 'Enviado',
};

export interface Ajuste {
  id: string;
  clienteId: string | null;
  orgaoNome: string | null;
  entidadeBeneficiariaId: string;
  entidadeNome: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida: string | null;
  codigoAjuste: string;
  numero: string | null;
  objeto: string;
  valorGlobal: number;
  dataAssinatura: string; // 'YYYY-MM-DD'
  vigenciaInicial: string | null;
  vigenciaFinal: string | null;
  periodicidade: Periodicidade;
  status: StatusAjuste;

  previsaoFederal: number | null;
  previsaoEstadual: number | null;
  previsaoMunicipal: number | null;

  responsavelNome: string | null;
  responsavelCpf: string | null;
  responsavelDataNascimento: string | null;
  responsavelCep: string | null;
  responsavelLogradouro: string | null;
  responsavelNumero: string | null;
  responsavelComplemento: string | null;
  responsavelBairro: string | null;
  responsavelCidade: string | null;
  responsavelUf: string | null;
  responsavelEmail: string | null;
  responsavelTelefone: string | null;
  responsavelCargo: string | null;
  responsavelDataEntrada: string | null;
  responsavelDataSaida: string | null;

  /** Metadados do PDF do termo — o conteúdo vem pela rota de download. */
  termoCienciaArquivoNome: string | null;
  termoCienciaArquivoTamanho: number | null;

  publicacaoLocal: string | null;
  publicacaoLink: string | null;
  publicacaoData: string | null;

  criadoEm: string;
  atualizadoEm: string;
}

export interface AjustePayload {
  clienteId?: string | null;
  entidadeBeneficiariaId: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida?: string | null;
  codigoAjuste: string;
  numero?: string | null;
  objeto: string;
  valorGlobal: number;
  dataAssinatura: string;
  vigenciaInicial?: string | null;
  vigenciaFinal?: string | null;
  periodicidade: Periodicidade;
  status?: StatusAjuste;

  previsaoFederal?: number | null;
  previsaoEstadual?: number | null;
  previsaoMunicipal?: number | null;

  responsavelNome?: string | null;
  responsavelCpf?: string | null;
  responsavelDataNascimento?: string | null;
  responsavelCep?: string | null;
  responsavelLogradouro?: string | null;
  responsavelNumero?: string | null;
  responsavelComplemento?: string | null;
  responsavelBairro?: string | null;
  responsavelCidade?: string | null;
  responsavelUf?: string | null;
  responsavelEmail?: string | null;
  responsavelTelefone?: string | null;
  responsavelCargo?: string | null;
  responsavelDataEntrada?: string | null;
  responsavelDataSaida?: string | null;

  publicacaoLocal?: string | null;
  publicacaoLink?: string | null;
  publicacaoData?: string | null;
}

export interface FiltrosAjuste {
  codigoAjuste?: string;
  tipoAjuste?: string;
  status?: string;
  entidadeBeneficiariaId?: string;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
