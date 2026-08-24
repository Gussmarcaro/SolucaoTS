export type TipoAjuste =
  | 'CONTRATO_GESTAO'
  | 'CONVENIO'
  | 'TERMO_COLABORACAO'
  | 'TERMO_FOMENTO'
  | 'TERMO_PARCERIA';

export type Periodicidade = 'ANUAL' | 'QUADRIMESTRAL';
export type StatusAjuste = 'EM_ELABORACAO' | 'ENVIADO';

/** Entidade de domínio — Ajuste (Convênio, Termo, Contrato de Gestão…). */
/** Conta bancária declarada no ajuste. */
export interface ContaBancariaAjuste {
  id: string;
  banco: number;
  agencia: number;
  conta: string;
  contaTipo: number | null;
  apelido: string | null;
}

export interface Ajuste {
  id: string;
  clienteId: string | null;
  orgaoNome: string | null; // nome do órgão prestador (join p/ exibição)
  entidadeBeneficiariaId: string;
  entidadeNome: string; // razão social da beneficiária (join p/ exibição)
  tipoAjuste: TipoAjuste;
  /** Descrição curta para identificar o ajuste nas telas — não vai ao TCESP. */
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

  // Previsão por fontes de recursos
  previsaoFederal: number | null;
  previsaoEstadual: number | null;
  previsaoMunicipal: number | null;

  /**
   * Fontes de recurso previstas — códigos da tabela do TCESP.
   * São elas que o lançamento de pagamento pode escolher.
   */
  fontesRecurso: number[];
  /** Contas bancárias do ajuste, oferecidas no pagamento. */
  contasBancarias: ContaBancariaAjuste[];

  // Responsável pelo ajuste e sua vigência
  responsavelNome: string | null;
  responsavelCpf: string | null; // só dígitos
  responsavelDataNascimento: string | null; // 'YYYY-MM-DD'
  responsavelCep: string | null; // só dígitos
  responsavelLogradouro: string | null;
  responsavelNumero: string | null;
  responsavelComplemento: string | null;
  responsavelBairro: string | null;
  responsavelCidade: string | null;
  responsavelUf: string | null;
  responsavelEmail: string | null;
  responsavelTelefone: string | null; // só dígitos
  responsavelCargo: string | null;
  responsavelDataEntrada: string | null;
  responsavelDataSaida: string | null;

  /** Metadados do Termo de Ciência — o PDF é lido à parte, sob demanda. */
  termoCienciaArquivoNome: string | null;
  termoCienciaArquivoTamanho: number | null;

  // Publicação do ajuste
  publicacaoLocal: string | null;
  publicacaoLink: string | null;
  publicacaoData: string | null;

  criadoEm: Date;
  atualizadoEm: Date;
}
