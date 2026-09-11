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

/**
 * Plano digitado na tela, no formato do papel: **um valor mensal por rubrica**.
 *
 * O anual não vem do cliente — é o mensal × 12, e essa conta fica no caso de
 * uso. Aceitá-lo de fora permitiria gravar um anual que não corresponde ao
 * mensal exibido, e nada acusaria.
 */
export interface PlanoDigitadoDTO {
  ano?: number | string;
  itens?: {
    categoria?: string;
    subcategoria?: string;
    valorMensal?: number | string | null;
    descricao?: string | null;
  }[];
}
