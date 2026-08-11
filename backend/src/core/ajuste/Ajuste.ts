export type TipoAjuste =
  | 'CONTRATO_GESTAO'
  | 'CONVENIO'
  | 'TERMO_COLABORACAO'
  | 'TERMO_FOMENTO'
  | 'TERMO_PARCERIA';

export type Periodicidade = 'ANUAL' | 'QUADRIMESTRAL';
export type StatusAjuste = 'EM_ELABORACAO' | 'ENVIADO';

/** Entidade de domínio — Ajuste (Convênio, Termo, Contrato de Gestão…). */
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
  criadoEm: Date;
  atualizadoEm: Date;
}
