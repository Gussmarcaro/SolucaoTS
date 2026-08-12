/**
 * Complementos da Entidade Beneficiária: diretoria, conselhos, documentos de
 * regularidade e as atas de eleição. Todos existem apenas vinculados a uma
 * entidade.
 *
 * Datas trafegam como 'YYYY-MM-DD' e o conteúdo dos PDFs nunca aparece aqui —
 * só o nome e o tamanho. O binário é lido pela rota de download.
 */

export type TipoConselho = 'ADMINISTRACAO' | 'FISCAL' | 'ESPECIAIS';

export type TipoDocumentoRegularidade =
  | 'FEDERAL'
  | 'ESTADUAL'
  | 'MUNICIPAL'
  | 'FGTS'
  | 'TRABALHISTA'
  | 'CEBAS'
  | 'UTILIDADE_PUBLICA'
  | 'ENTIDADE_BENEFICENTE'
  | 'OUTRAS';

/** Dados pessoais + endereço, iguais em diretoria e conselhos. */
export interface PessoaVinculada {
  nome: string;
  cpf: string | null; // só dígitos
  dataNascimento: string | null;
  cep: string | null; // só dígitos
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  email: string | null;
  telefone: string | null; // só dígitos
  cargo: string | null;
  dataEntrada: string | null;
  dataSaida: string | null; // vazia = ainda no exercício da função
}

export interface MembroDiretoria extends PessoaVinculada {
  id: string;
  entidadeBeneficiariaId: string;
  ataDataEleicao: string | null;
  ataDataRegistro: string | null;
  ataLocalRegistro: string | null;
  possuiRemuneracao: boolean;
  remuneracaoDescricao: string | null;
  remuneracaoArtigo: string | null;
  /** Aberto de propósito — os campos de valores ainda não estão definidos. */
  remuneracaoValores: unknown;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface MembroConselho extends PessoaVinculada {
  id: string;
  entidadeBeneficiariaId: string;
  tipoConselho: TipoConselho;
  ataDataNomeacao: string | null;
  ataDataRegistro: string | null;
  ataLocalRegistro: string | null;
  ataArquivoNome: string | null;
  ataArquivoTamanho: number | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DocumentoRegularidade {
  id: string;
  entidadeBeneficiariaId: string;
  tipo: TipoDocumentoRegularidade;
  arquivoNome: string | null;
  arquivoTamanho: number | null;
  dataGeracao: string | null;
  dataVencimento: string | null;
  publicacao: string | null;
  orgaoEmissor: string | null;
  legislacao: string | null;
  data: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface AtaDiretoriaArquivo {
  id: string;
  entidadeBeneficiariaId: string;
  arquivoNome: string;
  arquivoTamanho: number;
  criadoEm: Date;
}

/** PDF vindo do upload (multipart), pronto para persistir. */
export interface ArquivoPdf {
  nome: string;
  tamanho: number;
  conteudo: Buffer;
}

/**
 * Só OUTRAS aceita mais de um registro por entidade: os demais tipos são um
 * documento único, editado no lugar (upsert).
 */
export function aceitaVarios(tipo: TipoDocumentoRegularidade): boolean {
  return tipo === 'OUTRAS';
}
