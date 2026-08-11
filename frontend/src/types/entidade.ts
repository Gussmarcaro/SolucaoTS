export interface Entidade {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  dataConstituicao: string | null;
  finalidadeDescricao: string | null;
  finalidadeArtigo: string | null;
  dataUltimaAlteracao: string | null;
  /** Metadados do PDF do estatuto — o conteúdo vem pela rota de download. */
  estatutoArquivoNome: string | null;
  estatutoArquivoTamanho: number | null;
  estatutoDataInicial: string | null;
  estatutoDataAlteracao: string | null;
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
  criadoEm: string;
  atualizadoEm: string;
}

export interface EntidadePayload {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  dataConstituicao?: string | null;
  finalidadeDescricao?: string | null;
  finalidadeArtigo?: string | null;
  dataUltimaAlteracao?: string | null;
  estatutoDataInicial?: string | null;
  // `estatutoDataAlteracao` não vai no payload: quem preenche é o backend.
  cep: string;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  email: string;
  telefoneFixo?: string | null;
  whatsapp?: string | null;
}

export interface FiltrosEntidade {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
  ativo?: boolean;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
