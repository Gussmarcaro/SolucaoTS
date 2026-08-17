import type { StatusPrestacao } from '@/types/prestacao';

/** Uma parceria como o backend devolve em `GET /transparencia`. */
export interface Parceria {
  ajusteId: string;
  codigoAjuste: string;
  numero: string | null;
  tipoAjuste: string;
  objeto: string;
  entidadeNome: string;
  entidadeCnpj: string;
  orgaoNome: string | null;
  valorGlobal: number;
  dataAssinatura: string;
  vigenciaInicial: string | null;
  vigenciaFinal: string | null;
  publicacaoLocal: string | null;
  publicacaoData: string | null;
  publicacaoLink: string | null;
  prestacaoStatus: StatusPrestacao | null;
  prestacaoAno: number | null;
  /** O que impede a parceria de estar publicada conforme o art. 10. */
  pendencias: string[];
}
