import type { CategoriaBem } from '@/core/bemPrestacao/BemPrestacao';

export interface BemPrestacaoDTO {
  categoria: CategoriaBem;
  numeroPatrimonio?: string | null;
  descricao: string;
  data: string;
  valor?: number | string | null;
}

export interface DadosBemPrestacao {
  categoria: CategoriaBem;
  numeroPatrimonio: string | null;
  descricao: string;
  data: Date;
  valor: number | null;
}
