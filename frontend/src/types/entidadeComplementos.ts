export type TipoConselho = 'ADMINISTRACAO' | 'FISCAL' | 'ESPECIAIS';

export const TIPO_CONSELHO_LABEL: Record<TipoConselho, string> = {
  ADMINISTRACAO: 'Administração',
  FISCAL: 'Fiscal',
  ESPECIAIS: 'Especiais',
};

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

/** Campos comuns a diretoria e conselhos. */
export interface PessoaVinculada {
  nome: string;
  cpf: string | null;
  dataNascimento: string | null;
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
  dataEntrada: string | null;
  dataSaida: string | null;
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
  remuneracaoValores: ValorRemuneracao[] | null;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Uma linha da seção Valores. Os campos definitivos ainda não foram definidos —
 * o backend guarda isto como Json, então acrescentar um campo aqui não pede
 * migração nem mudança de contrato.
 */
export interface ValorRemuneracao {
  descricao: string;
  valor: number;
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
  criadoEm: string;
  atualizadoEm: string;
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
  criadoEm: string;
  atualizadoEm: string;
}

export interface AtaDiretoriaArquivo {
  id: string;
  entidadeBeneficiariaId: string;
  arquivoNome: string;
  arquivoTamanho: number;
  criadoEm: string;
}

export type MembroDiretoriaPayload = Partial<PessoaVinculada> & {
  nome: string;
  ataDataEleicao?: string | null;
  ataDataRegistro?: string | null;
  ataLocalRegistro?: string | null;
  possuiRemuneracao?: boolean;
  remuneracaoDescricao?: string | null;
  remuneracaoArtigo?: string | null;
  remuneracaoValores?: ValorRemuneracao[] | null;
};

export type MembroConselhoPayload = Partial<PessoaVinculada> & {
  nome: string;
  tipoConselho: TipoConselho;
  ataDataNomeacao?: string | null;
  ataDataRegistro?: string | null;
  ataLocalRegistro?: string | null;
};

export interface DocumentoRegularidadePayload {
  tipo: TipoDocumentoRegularidade;
  arquivoNome?: string | null;
  dataGeracao?: string | null;
  dataVencimento?: string | null;
  publicacao?: string | null;
  orgaoEmissor?: string | null;
  legislacao?: string | null;
  data?: string | null;
}

/**
 * Painéis da aba Regularidade Fiscal / Cadastral, na ordem da tela. `campos`
 * diz quais campos cada painel mostra — os documentos compartilham a mesma
 * tabela e variam só nisso.
 */
export interface PainelRegularidade {
  tipo: TipoDocumentoRegularidade;
  titulo: string;
  campos: ('geracaoVencimento' | 'publicacao' | 'orgaoLegislacaoData')[];
  varios?: boolean;
}

export const PAINEIS_REGULARIDADE: PainelRegularidade[] = [
  { tipo: 'FEDERAL', titulo: 'Certidão de Regularidade Federal', campos: ['geracaoVencimento'] },
  { tipo: 'ESTADUAL', titulo: 'Certidão de Regularidade Estadual', campos: ['geracaoVencimento'] },
  { tipo: 'MUNICIPAL', titulo: 'Certidão de Regularidade Municipal', campos: ['geracaoVencimento'] },
  { tipo: 'FGTS', titulo: 'Certificado de Regularidade FGTS', campos: ['geracaoVencimento'] },
  { tipo: 'TRABALHISTA', titulo: 'Certificado de Regularidade Trabalhista', campos: ['geracaoVencimento'] },
  { tipo: 'CEBAS', titulo: 'CEBAS', campos: ['geracaoVencimento', 'publicacao'] },
  { tipo: 'UTILIDADE_PUBLICA', titulo: 'Declaração de Utilidade Pública', campos: ['orgaoLegislacaoData'] },
  { tipo: 'ENTIDADE_BENEFICENTE', titulo: 'Certificado de Entidade Beneficente', campos: ['orgaoLegislacaoData'] },
  {
    tipo: 'OUTRAS',
    titulo: 'Outras',
    campos: ['geracaoVencimento', 'publicacao', 'orgaoLegislacaoData'],
    varios: true,
  },
];
