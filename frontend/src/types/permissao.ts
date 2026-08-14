export type NivelPermissao = 'SEM_ACESSO' | 'CONSULTA' | 'EDICAO' | 'TOTAL';

export interface Recurso {
  id: string;
  rotulo: string;
  secao: string;
  temAprovacao?: boolean;
  restrito?: boolean;
}

export interface AcessoDoRecurso {
  recursoId: string;
  nivel: NivelPermissao;
  aprovacao?: boolean;
}

/** As faixas, da mais restrita à mais ampla — a ordem em que aparecem na tela. */
export const NIVEIS: { valor: NivelPermissao; rotulo: string; ajuda: string }[] = [
  { valor: 'SEM_ACESSO', rotulo: 'Sem acesso', ajuda: 'A tela não aparece no menu.' },
  { valor: 'CONSULTA', rotulo: 'Consulta', ajuda: 'Abrir e ver; sem gravar nada.' },
  { valor: 'EDICAO', rotulo: 'Edição', ajuda: 'Incluir e alterar; sem excluir.' },
  { valor: 'TOTAL', rotulo: 'Total', ajuda: 'Tudo, inclusive excluir e inativar.' },
];

export const NIVEL_LABEL: Record<NivelPermissao, string> = {
  SEM_ACESSO: 'Sem acesso',
  CONSULTA: 'Consulta',
  EDICAO: 'Edição',
  TOTAL: 'Total',
};
