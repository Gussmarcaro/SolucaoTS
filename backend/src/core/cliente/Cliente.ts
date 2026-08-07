import type { TipoOrgao, Periodicidade } from '@prisma/client';

/** Entidade de domínio — Órgão público (Cliente/tenant) que presta contas ao TCESP. */
export interface Cliente {
  id: string;
  nome: string;
  codigoMunicipio: number; // código do município no TCESP (1–9999)
  codigoEntidade: number; // código da entidade no TCESP (1–99999)
  tipoOrgao: TipoOrgao;
  periodicidade: Periodicidade;
  cnpj: string; // apenas dígitos
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
