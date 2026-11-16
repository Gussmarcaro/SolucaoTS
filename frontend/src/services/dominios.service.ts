import type { Periodicidade, TipoOrgao } from '@/types/orgao';
import { http } from './http';

/**
 * Tabelas de domínio oficiais da Fase V (somente leitura).
 *
 * Os códigos vêm do banco, carregados por seed a partir das publicações do
 * TCESP/MTE. As tabelas têm milhares de linhas, então a consulta é sempre
 * paginada por busca — daí o autocomplete em vez de um Select carregado.
 */

export interface CboItem {
  codigo: string;
  titulo: string;
  medico: boolean;
}

export interface ClassificacaoEconomicaItem {
  codigo: string;
  exercicio: number;
  categoria: string;
  grupo: string;
  modalidade: string;
  elemento: string;
  subelemento: string;
  nome: string;
  /** 'E' = obrigatório na execução da despesa · 'O' = apenas orçamento. */
  escrituracao: string | null;
  /** Entes que utilizam o código (combinação de E/M/C). */
  entes: string;
  situacao: string | null;
}

/**
 * Entidade cadastrada no Sistema Audesp — o par de códigos que identifica o
 * órgão no descritor de tudo que é transmitido.
 *
 * `tipoOrgao` e `periodicidade` vêm nulos nas entidades que a lista oficial da
 * Fase V não alcança; nesse caso o formulário deixa quem cadastra escolher.
 */
export interface EntidadeAudespItem {
  codigoMunicipio: number;
  codigoEntidade: number;
  nomeMunicipio: string;
  nomeEntidade: string;
  tipoOrgao: TipoOrgao | null;
  periodicidade: Periodicidade | null;
}

export interface ComponenteDespesaItem {
  tipo: string;
  codigo: string;
  nome: string;
}

export const dominiosApi = {
  async buscarCbos(busca: string, limite = 20): Promise<CboItem[]> {
    const { data } = await http.get<{ itens: CboItem[] }>('/dominios/cbo', { params: { busca, limite } });
    return data.itens;
  },

  /** Retorna null quando o código não existe na tabela oficial. */
  async obterCbo(codigo: string): Promise<CboItem | null> {
    try {
      const { data } = await http.get<CboItem>(`/dominios/cbo/${codigo}`);
      return data;
    } catch {
      return null;
    }
  },

  async buscarClassificacoes(
    busca: string,
    opcoes: { exercicio?: number; ente?: string; limite?: number } = {},
  ): Promise<ClassificacaoEconomicaItem[]> {
    const { data } = await http.get<{ itens: ClassificacaoEconomicaItem[] }>('/dominios/classificacao-economica', {
      params: { busca, limite: opcoes.limite ?? 20, exercicio: opcoes.exercicio, ente: opcoes.ente },
    });
    return data.itens;
  },

  async obterClassificacao(codigo: string, exercicio?: number): Promise<ClassificacaoEconomicaItem | null> {
    try {
      const { data } = await http.get<ClassificacaoEconomicaItem>(`/dominios/classificacao-economica/${codigo}`, {
        params: { exercicio },
      });
      return data;
    } catch {
      return null;
    }
  },

  async listarComponentes(tipo?: string): Promise<ComponenteDespesaItem[]> {
    const { data } = await http.get<{ itens: ComponenteDespesaItem[] }>('/dominios/componentes-despesa', {
      params: { tipo },
    });
    return data.itens;
  },

  async buscarEntidadesAudesp(busca: string, limite = 20): Promise<EntidadeAudespItem[]> {
    const { data } = await http.get<{ itens: EntidadeAudespItem[] }>('/dominios/entidades-audesp', {
      params: { busca, limite },
    });
    return data.itens;
  },

  /** Retorna null quando o par de códigos não está na tabela oficial. */
  async obterEntidadeAudesp(
    codigoMunicipio: number,
    codigoEntidade: number,
  ): Promise<EntidadeAudespItem | null> {
    try {
      const { data } = await http.get<EntidadeAudespItem>(
        `/dominios/entidades-audesp/${codigoMunicipio}/${codigoEntidade}`,
      );
      return data;
    } catch {
      return null;
    }
  },

  async exerciciosClassificacao(): Promise<number[]> {
    const { data } = await http.get<{ itens: number[] }>('/dominios/classificacao-economica/exercicios');
    return data.itens;
  },
};
