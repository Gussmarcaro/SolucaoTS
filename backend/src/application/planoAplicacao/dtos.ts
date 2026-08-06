import type { PlanoAplicacaoItem } from '@/core/planoAplicacao/PlanoAplicacaoItem';

/** Item normalizado do plano, pronto para persistência (sem id/ajusteId). */
export interface DadosPlanoItem {
  categoria: string;
  subcategoria: string;
  ano: number;
  mes: number;
  valor: number;
  descricao: string | null;
}

export interface ResultadoImportacaoPlano {
  itens: PlanoAplicacaoItem[];
  totalLinhas: number;
  importados: number;
  ignoradas: number;
  erros: string[];
}
