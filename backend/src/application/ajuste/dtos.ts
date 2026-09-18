import type { Periodicidade, StatusAjuste, TipoAjuste } from '@/core/ajuste/Ajuste';

export interface CriarAjusteDTO {
  clienteId?: string | null;
  entidadeBeneficiariaId: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida?: string | null;
  codigoAjuste: string;
  numero?: string | null;
  objeto: string;
  valorGlobal: number | string;
  dataAssinatura: string;
  vigenciaInicial?: string | null;
  vigenciaFinal?: string | null;
  periodicidade: Periodicidade;
  status?: StatusAjuste;

  previsaoFederal?: number | string | null;
  previsaoEstadual?: number | string | null;
  previsaoMunicipal?: number | string | null;

  /** Fontes de recurso previstas — códigos da tabela do TCESP. */
  fontesRecurso?: (number | string)[];
  /** Contas bancárias do ajuste, que os pagamentos poderão usar. */
  contasBancarias?: {
    /** Conta do cadastro do órgão de onde esta foi escolhida. */
    contaBancariaId?: string | null;
    banco?: number | string | null;
    agencia?: number | string | null;
    conta?: string | null;
    contaTipo?: number | string | null;
    fonteRecursoTipo?: number | string | null;
    apelido?: string | null;
  }[];

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
  // O PDF do Termo de Ciência sobe por rota própria (multipart), não por aqui.
}

export type AtualizarAjusteDTO = CriarAjusteDTO;

/** Dados normalizados/validados prontos para persistência. */
export interface DadosAjuste {
  clienteId: string | null;
  entidadeBeneficiariaId: string;
  tipoAjuste: TipoAjuste;
  descricaoResumida: string | null;
  codigoAjuste: string;
  numero: string | null;
  objeto: string;
  valorGlobal: number;
  dataAssinatura: Date;
  vigenciaInicial: Date | null;
  vigenciaFinal: Date | null;
  periodicidade: Periodicidade;
  status: StatusAjuste;

  previsaoFederal: number | null;
  previsaoEstadual: number | null;
  previsaoMunicipal: number | null;

  fontesRecurso: number[];
  contasBancarias: {
    contaBancariaId: string | null;
    banco: number;
    agencia: number;
    conta: string;
    contaTipo: number | null;
    fonteRecursoTipo: number;
    apelido: string | null;
  }[];

  responsavelNome: string | null;
  responsavelCpf: string | null;
  responsavelDataNascimento: Date | null;
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
  responsavelDataEntrada: Date | null;
  responsavelDataSaida: Date | null;

  publicacaoLocal: string | null;
  publicacaoLink: string | null;
  publicacaoData: Date | null;
}

/** PDF do Termo de Ciência e Notificação vindo do upload (multipart). */
/**
 * Os documentos que se anexam ao ajuste.
 *
 * Enumerados, e não texto livre: são dois anexos que os manuais nomeiam, e
 * cada um tem lugar próprio na tela. Um terceiro custa uma entrada aqui, três
 * colunas no schema e um caso no adapter — nenhuma regra nova.
 */
export type TipoDocumentoAjuste = 'TERMO_CIENCIA' | 'AJUSTE_ASSINADO';

/** Rótulo para a mensagem de erro falar a língua do usuário. */
export const DOCUMENTO_AJUSTE_LABEL: Record<TipoDocumentoAjuste, string> = {
  TERMO_CIENCIA: 'Termo de Ciência e Notificação',
  AJUSTE_ASSINADO: 'Ajuste Celebrado',
};

export interface ArquivoAjuste {
  nome: string;
  tamanho: number;
  conteudo: Buffer;
}

export interface FiltrosAjuste {
  codigoAjuste?: string;
  tipoAjuste?: string;
  status?: string;
  entidadeBeneficiariaId?: string;
}

export interface ListarAjustesParams {
  filtros: FiltrosAjuste;
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
