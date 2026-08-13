/**
 * Tipos que a busca global percorre. A ordem é a da apresentação: o que a
 * pessoa procura com mais frequência aparece primeiro.
 */
export type TipoResultado =
  | 'AJUSTE'
  | 'PRESTACAO'
  | 'ENTIDADE'
  | 'FORNECEDOR'
  | 'COLABORADOR'
  | 'CONTRATO'
  | 'BEM_CEDIDO'
  | 'SERVIDOR_CEDIDO'
  | 'ORGAO';

/**
 * Um item encontrado. Sem rota: para onde navegar é decisão da interface, e o
 * núcleo não conhece as telas.
 */
export interface ResultadoBusca {
  tipo: TipoResultado;
  id: string;
  titulo: string;
  /** Linha de apoio — documento, entidade vinculada, período… */
  subtitulo: string | null;
}
