/** Espelha `core/documento/demonstrativoIntegral.ts` — o texto e as contas vêm prontos do servidor. */
export type Esfera = 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL';

export const ROTULO_ESFERA: Record<Esfera, string> = {
  FEDERAL: 'Federal',
  ESTADUAL: 'Estadual',
  MUNICIPAL: 'Municipal',
};

export interface ColunasDespesa {
  contabilizadas: number;
  anterioresPagas: number;
  contabilizadasPagas: number;
  totalPago: number;
  aPagar: number;
}

export interface AnexoEsfera {
  esfera: Esfera;
  repasses: {
    dataPrevista: string | null;
    valorPrevisto: number | null;
    dataRepasse: string | null;
    numeroDocumento: string | null;
    valorRepasse: number;
  }[];
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
  despesas: ({ id: string; rotulo: string } & ColunasDespesa)[];
  totalDespesas: ColunasDespesa;
  J: number;
  K: number;
  L: number;
  M: number;
}

export interface DemonstrativoIntegral {
  anexo: string;
  vocabulario: {
    anexo: string;
    modalidade: string;
    rotuloOrgao: string;
    rotuloEntidade: string;
    rotuloGerenciada: string | null;
    rotuloResponsavel: string;
    rotuloObjeto: string;
    instrumento: string;
    rotuloProprios: string;
    orgaoNaDeclaracao: string;
    assinantes: string;
  };
  exercicio: number;
  orgaoNome: string;
  entidade: { nome: string; cnpj: string | null; endereco: string | null };
  responsavel: { nome: string | null; cargo: string | null; cpf: string | null };
  objeto: string;
  instrumentos: { documento: string; data: string | null; vigencia: string | null; valor: number | null }[];
  localEData: string;
  textos: { signatario: string; declaracao: string; notasRecursos: string[]; notasDespesas: string[] };
  anexos: AnexoEsfera[];
  faltando: string[];
}
