export interface CriarEntidadeDTO {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  dataConstituicao?: string | null; // ISO (YYYY-MM-DD)
  finalidadeDescricao?: string | null;
  finalidadeArtigo?: string | null;
  dataUltimaAlteracao?: string | null; // ISO (YYYY-MM-DD)
  estatutoDataInicial?: string | null; // ISO (YYYY-MM-DD)
  // `estatutoDataAlteracao` não entra aqui de propósito: é carimbada pelo
  // sistema quando o estatuto muda, não informada por quem cadastra.
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

export type AtualizarEntidadeDTO = CriarEntidadeDTO;

/**
 * Dados normalizados/validados prontos para persistência.
 * `estatutoDataAlteracao` é decidida pelo caso de uso — ver `DadosEntidadeEntrada`.
 */
export interface DadosEntidade {
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  dataConstituicao: Date | null;
  finalidadeDescricao: string | null;
  finalidadeArtigo: string | null;
  dataUltimaAlteracao: Date | null;
  estatutoDataInicial: Date | null;
  estatutoDataAlteracao: Date | null;
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
}

/** O que a validação devolve: tudo menos o carimbo de alteração do estatuto. */
export type DadosEntidadeEntrada = Omit<DadosEntidade, 'estatutoDataAlteracao'>;

/** PDF do estatuto vindo do upload (multipart), pronto para persistir. */
export interface ArquivoEstatuto {
  nome: string;
  tamanho: number;
  conteudo: Buffer;
}

export interface FiltrosEntidade {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
  ativo?: boolean;
}

export interface ListarEntidadesParams {
  filtros: FiltrosEntidade;
  busca?: string;
  ordem?: { campo: string; direcao: 'asc' | 'desc' };
  page: number;
  pageSize: number;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
