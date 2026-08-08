/**
 * Tabelas de domínio oficiais da Fase V.
 *
 * São códigos publicados pelo TCESP/MTE, carregados por seed e apenas
 * consultados pela aplicação. Informar um código inexistente é causa de
 * rejeição no envio da prestação, por isso os formulários selecionam daqui em
 * vez de aceitar digitação livre.
 */

/** Ocupação do CBO 2002 — campo `cbo` da Relação de Empregados. */
export interface Cbo {
  codigo: string; // 6 dígitos
  titulo: string;
}

/** Subgrupo 225 do CBO = médicos; para eles o CNS é obrigatório (§5 #6). */
export const SUBGRUPO_CBO_MEDICO = '225';

export function ehMedico(cbo: string): boolean {
  return (cbo ?? '').replace(/\D/g, '').startsWith(SUBGRUPO_CBO_MEDICO);
}

/**
 * Classificação econômica da despesa — campo `classificacao_economica_tipo`
 * dos Empenhos. O código de 8 dígitos concatena
 * categoria(1) + grupo(1) + modalidade(2) + elemento(2) + subelemento(2).
 */
export interface ClassificacaoEconomica {
  codigo: string;
  exercicio: number;
  categoria: string;
  grupo: string;
  modalidade: string;
  elemento: string;
  subelemento: string;
  nome: string;
  /** 'E' = obrigatório na execução da despesa · 'O' = apenas orçamento. */
  escrituracao: string | null;
  /** Entes que utilizam o código: combinação de E (Estado), M e C. */
  entes: string;
  situacao: string | null;
}

/** Esfera do ente, para filtrar a validade do código (§17 #2). */
export type EnteDespesa = 'E' | 'M' | 'C';

/** Tabelas auxiliares que compõem o código da classificação econômica. */
export type TipoComponenteDespesa =
  | 'CATEGORIA_ECONOMICA'
  | 'GRUPO_NATUREZA'
  | 'MODALIDADE_APLICACAO'
  | 'ELEMENTO_DESPESA';

export interface ComponenteDespesa {
  tipo: string;
  codigo: string;
  nome: string;
}
