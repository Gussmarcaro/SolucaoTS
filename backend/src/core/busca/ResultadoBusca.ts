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
  // Lançamentos. Vêm depois dos cadastros de propósito: quem digita na barra
  // procura uma **coisa** (a entidade, o ajuste, o fornecedor) com muito mais
  // frequência do que um lançamento. Pôr a nota fiscal no topo empurraria a
  // parceria para baixo da dobra.
  //
  // Só entraram os três que têm identificador próprio — algo que alguém tem na
  // mão e digita. Pagamento e Receita ficaram de fora: eles se encontram *pela*
  // nota ou *pelo* ajuste, e na busca global só somariam linhas.
  | 'DESPESA'
  | 'CONTA_BANCARIA'
  | 'GUIA_RECOLHIMENTO'
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
