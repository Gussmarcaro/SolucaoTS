export type TipoOrgao =
  | 'PREFEITURA_MUNICIPAL'
  | 'CAMARA'
  | 'AUTARQUIA_MUNICIPAL'
  | 'CONSORCIO_MUNICIPAL'
  | 'FUNDACAO_MUNICIPAL'
  | 'FUNDO_PREVIDENCIA_MUNICIPAL'
  | 'EMPRESA_PUBLICA'
  | 'UNIDADE_SECRETARIA';

export type Periodicidade = 'ANUAL' | 'QUADRIMESTRAL';

export const TIPO_ORGAO_LABEL: Record<TipoOrgao, string> = {
  PREFEITURA_MUNICIPAL: 'Prefeitura Municipal',
  CAMARA: 'Câmara Municipal',
  AUTARQUIA_MUNICIPAL: 'Autarquia Municipal',
  CONSORCIO_MUNICIPAL: 'Consórcio Municipal',
  FUNDACAO_MUNICIPAL: 'Fundação Municipal',
  FUNDO_PREVIDENCIA_MUNICIPAL: 'Fundo de Previdência Municipal',
  EMPRESA_PUBLICA: 'Empresa Pública',
  UNIDADE_SECRETARIA: 'Unidade/Secretaria',
};

export const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  ANUAL: 'Anual',
  QUADRIMESTRAL: 'Quadrimestral',
};

export interface Orgao {
  id: string;
  nome: string;
  codigoMunicipio: number;
  codigoEntidade: number;
  tipoOrgao: TipoOrgao;
  /** Se o órgão empenha o repasse — governa a aba de Empenhos da prestação. */
  empenhaRepasse: boolean;
  periodicidade: Periodicidade;
  cnpj: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface OrgaoPayload {
  nome: string;
  codigoMunicipio: number | string;
  codigoEntidade: number | string;
  tipoOrgao: TipoOrgao;
  /** Se o órgão empenha o repasse — governa a aba de Empenhos da prestação. */
  empenhaRepasse: boolean;
  periodicidade: Periodicidade;
  cnpj: string;
}

export interface FiltrosOrgao {
  nome?: string;
  cnpj?: string;
  tipoOrgao?: string;
  periodicidade?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
