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
  // O critério para entrar é ter **identificador próprio** — algo que alguém
  // tem na mão e digita: o número da nota, o apelido da conta, o número da
  // guia, o número da transação do pagamento.
  //
  // `Receita` continua de fora por não ter nenhum: ela é tipo + valor, e se
  // encontra pelo ajuste. E a conciliação bancária também, por outro motivo —
  // é a maior tabela do sistema, o texto dela vem do banco ("TED RECEBIDA"), e
  // o trajeto real até uma linha de extrato começa na tela de Conciliação.
  | 'DESPESA'
  | 'PAGAMENTO'
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
