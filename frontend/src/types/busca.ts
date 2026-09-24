export type TipoResultado =
  | 'AJUSTE'
  | 'PRESTACAO'
  | 'ENTIDADE'
  | 'FORNECEDOR'
  | 'COLABORADOR'
  | 'CONTRATO'
  | 'BEM_CEDIDO'
  | 'SERVIDOR_CEDIDO'
  // Lançamentos, depois dos cadastros: quem digita na barra procura uma coisa
  // (a entidade, o ajuste) muito mais do que um lançamento. Entram os que têm
  // identificador próprio — número da nota, da transação, da guia, apelido da
  // conta. Espelha `core/busca/ResultadoBusca.ts` no backend.
  | 'DESPESA'
  | 'PAGAMENTO'
  | 'CONTA_BANCARIA'
  | 'GUIA_RECOLHIMENTO'
  | 'ORGAO';

export interface ResultadoBusca {
  tipo: TipoResultado;
  id: string;
  titulo: string;
  subtitulo: string | null;
}

export const TIPO_BUSCA_LABEL: Record<TipoResultado, string> = {
  AJUSTE: 'Ajustes',
  PRESTACAO: 'Prestações de Contas',
  ENTIDADE: 'Entidades / Beneficiárias',
  FORNECEDOR: 'Fornecedores',
  COLABORADOR: 'Colaboradores',
  CONTRATO: 'Contratos',
  BEM_CEDIDO: 'Bens Cedidos',
  SERVIDOR_CEDIDO: 'Servidores Cedidos',
  DESPESA: 'Despesas / Notas Fiscais',
  PAGAMENTO: 'Pagamentos',
  CONTA_BANCARIA: 'Contas Bancárias',
  GUIA_RECOLHIMENTO: 'Guias de Recolhimento',
  ORGAO: 'Órgãos Concessores',
};

/**
 * Para onde cada resultado leva. Ajuste e Prestação abrem o próprio dossiê; os
 * demais cadastros não têm página individual, então a busca leva à grade — de
 * onde o registro é aberto pelas ações da linha.
 */
export function rotaDoResultado(r: ResultadoBusca): string {
  switch (r.tipo) {
    case 'AJUSTE':
      return `/cadastro/ajustes/${r.id}`;
    case 'PRESTACAO':
      return `/prestacao-contas/${r.id}`;
    case 'ENTIDADE':
      return `/cadastro/entidades/${r.id}`;
    case 'FORNECEDOR':
      return '/cadastro/fornecedores';
    case 'COLABORADOR':
      return '/cadastro/colaboradores';
    case 'CONTRATO':
      return '/cadastro/contratos';
    case 'BEM_CEDIDO':
      return '/cadastro/bens-cedidos';
    case 'SERVIDOR_CEDIDO':
      return '/cadastro/servidores-cedidos';
    case 'DESPESA':
      return '/execucao/financeiro/despesas';
    case 'PAGAMENTO':
      return '/execucao/financeiro/pagamentos';
    case 'CONTA_BANCARIA':
      return '/execucao/financeiro/contas-bancarias';
    case 'GUIA_RECOLHIMENTO':
      return '/execucao/financeiro/guias';
    case 'ORGAO':
      return '/orgaos';
  }
}
