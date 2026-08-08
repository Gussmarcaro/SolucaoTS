/**
 * Tabelas de domínio da Fase V.
 *
 * As tabelas **pequenas e estáveis** abaixo vêm de enums/normas conhecidas e são
 * usadas como opções de Select.
 *
 * As tabelas **grandes e oficiais** não ficam aqui: são carregadas no banco por
 * seed e consultadas pela API (`/dominios`, ver `services/dominios.service.ts`),
 * com os componentes `BuscaCbo` e `BuscaClassificacao`. Hoje temos **CBO 2002** e
 * **classificação econômica da despesa**.
 *
 * Ainda **sem fonte oficial**: `categoria_despesas_tipo` (Documentos Fiscais) e
 * `fonte_recurso_tipo` — são tabelas próprias do TCESP, publicadas apenas no JSON
 * Schema oficial do Audesp, que ainda não temos. Seguem como entrada numérica;
 * inventar código causa rejeição no envio (ver §12).
 */

export type Opcao = { value: string; label: string };

/** Tipo de documento do credor (1=CPF, 2=CNPJ, 3=RNE). */
export const TIPO_DOCUMENTO: Opcao[] = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'RNE', label: 'RNE (estrangeiro)' },
];

/** Meio de pagamento (1=Banco, 2=Fundo fixo). */
export const MEIO_PAGAMENTO: Opcao[] = [
  { value: 'BANCO', label: 'Banco' },
  { value: 'FUNDO_FIXO', label: 'Fundo fixo' },
];

/** Resultado da análise de glosa (1=Aprovado, 2=Parcial, 3=Reprovado). */
export const RESULTADO_ANALISE: Opcao[] = [
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'APROVADO_PARCIALMENTE', label: 'Aprovado parcialmente' },
  { value: 'REPROVADO', label: 'Reprovado' },
];

export const RESULTADO_ANALISE_LABEL: Record<string, string> = {
  APROVADO: 'Aprovado',
  APROVADO_PARCIALMENTE: 'Aprovado parcialmente',
  REPROVADO: 'Reprovado',
};

/** Meses (1–12) para editores de período. */
export const MESES: Opcao[] = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

/**
 * CBO do subgrupo 225 = médicos → CNS obrigatório na Relação de Empregados (§7 #5).
 */
export function ehMedico(cbo: string): boolean {
  return /^225/.test((cbo ?? '').replace(/\D/g, ''));
}
