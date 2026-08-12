import type {
  TipoConselho,
  TipoDocumentoRegularidade,
} from '@/core/entidade/complementos';

/** Campos de pessoa vindos da tela (datas em ISO, documentos com máscara). */
export interface PessoaDTO {
  nome: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  email?: string | null;
  telefone?: string | null;
  cargo?: string | null;
  dataEntrada?: string | null;
  dataSaida?: string | null;
}

export interface MembroDiretoriaDTO extends PessoaDTO {
  ataDataEleicao?: string | null;
  ataDataRegistro?: string | null;
  ataLocalRegistro?: string | null;
  possuiRemuneracao?: boolean;
  remuneracaoDescricao?: string | null;
  remuneracaoArtigo?: string | null;
  remuneracaoValores?: unknown;
}

export interface MembroConselhoDTO extends PessoaDTO {
  tipoConselho: TipoConselho;
  ataDataNomeacao?: string | null;
  ataDataRegistro?: string | null;
  ataLocalRegistro?: string | null;
}

export interface DocumentoRegularidadeDTO {
  tipo: TipoDocumentoRegularidade;
  arquivoNome?: string | null;
  dataGeracao?: string | null;
  dataVencimento?: string | null;
  publicacao?: string | null;
  orgaoEmissor?: string | null;
  legislacao?: string | null;
  data?: string | null;
}

/** Pessoa já normalizada — datas em Date, documentos só com dígitos. */
export interface DadosPessoa {
  nome: string;
  cpf: string | null;
  dataNascimento: Date | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  dataEntrada: Date | null;
  dataSaida: Date | null;
}

export interface DadosMembroDiretoria extends DadosPessoa {
  ataDataEleicao: Date | null;
  ataDataRegistro: Date | null;
  ataLocalRegistro: string | null;
  possuiRemuneracao: boolean;
  remuneracaoDescricao: string | null;
  remuneracaoArtigo: string | null;
  remuneracaoValores: unknown;
}

export interface DadosMembroConselho extends DadosPessoa {
  tipoConselho: TipoConselho;
  ataDataNomeacao: Date | null;
  ataDataRegistro: Date | null;
  ataLocalRegistro: string | null;
}

export interface DadosDocumentoRegularidade {
  tipo: TipoDocumentoRegularidade;
  arquivoNome: string | null;
  dataGeracao: Date | null;
  dataVencimento: Date | null;
  publicacao: string | null;
  orgaoEmissor: string | null;
  legislacao: string | null;
  data: Date | null;
}
