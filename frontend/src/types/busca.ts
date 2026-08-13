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
    case 'ORGAO':
      return '/orgaos';
  }
}
