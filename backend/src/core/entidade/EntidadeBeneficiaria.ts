/** Entidade de domínio — Entidade Beneficiária (OSC que recebe o repasse). */
export interface EntidadeBeneficiaria {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string; // apenas dígitos
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  dataConstituicao: Date | null;
  finalidadeDescricao: string | null;
  finalidadeArtigo: string | null;
  dataUltimaAlteracao: Date | null;
  /** Metadados do estatuto — o conteúdo do PDF é lido à parte, sob demanda. */
  estatutoArquivoNome: string | null;
  estatutoArquivoTamanho: number | null;
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
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
